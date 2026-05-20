// Framer Plugin API handlers
// Each handler receives params from the MCP server and returns a string result.
// Docs: https://www.framer.com/developers/reference

import { framer } from "framer-plugin"

// ── Helpers ──────────────────────────────────────────────────────────────────

async function nodeToObj(node: any): Promise<Record<string, unknown>> {
  const obj: Record<string, unknown> = {
    id: node.id,
    name: node.name,
    type: node.type,
  }
  if (typeof node.getText === "function") {
    const text = await node.getText()
    if (text) obj.text = text
  }
  const children: any[] = typeof node.getChildren === "function"
    ? await node.getChildren()
    : Array.isArray(node.children) ? node.children : []
  if (children.length > 0) {
    obj.children = await Promise.all(children.map(nodeToObj))
  }
  return obj
}

async function resolveNode(nodeId: string): Promise<any | null> {
  // Try all known Framer API node-lookup methods
  const f = framer as any
  for (const method of ["getNodeByID", "getNode", "getComponentById", "getNodeById"]) {
    const node = await f[method]?.(nodeId)
    if (node) return node
  }
  // Fallback: current selection
  const selected = await f.getSelectedNodes?.() ?? await f.getSelection?.() ?? []
  const fromSelection = selected.find((n: any) => n.id === nodeId)
  if (fromSelection) return fromSelection
  // Fallback: recursive tree walk
  const pages = await f.getPages?.() ?? []
  async function walk(nodes: any[]): Promise<any | null> {
    for (const n of nodes) {
      if (n.id === nodeId) return n
      const children: any[] = typeof n.getChildren === "function"
        ? await n.getChildren()
        : Array.isArray(n.children) ? n.children : []
      const found = await walk(children)
      if (found) return found
    }
    return null
  }
  return walk(pages)
}

// ── Tool handlers ─────────────────────────────────────────────────────────────

export async function getProjectXml(): Promise<string> {
  const pages = await (framer as any).getPages?.() ?? []
  const result = await Promise.all(pages.map(nodeToObj))
  return JSON.stringify(result, null, 2)
}

export async function getNodeXml({ nodeId }: { nodeId: string }): Promise<string> {
  const node = await resolveNode(nodeId)
  if (!node) throw new Error(`Node ${nodeId} not found`)
  return JSON.stringify(await nodeToObj(node), null, 2)
}

export async function getSelectedNodesXml(): Promise<string> {
  const nodes = await (framer as any).getSelectedNodes?.() ?? await framer.getSelection?.() ?? []
  return JSON.stringify(await Promise.all(nodes.map(nodeToObj)), null, 2)
}

const TEXT_STYLE_KEYS = new Set(["balance", "fontSize", "fontWeight", "fontStyle", "letterSpacing", "lineHeight", "textAlign", "textDecoration", "textTransform", "fontFamily", "fontVariant"])

export async function updateXmlForNode({
  nodeId,
  xml,
}: {
  nodeId: string
  xml: string
}): Promise<string> {
  const node = await resolveNode(nodeId)
  if (!node) throw new Error(`Node ${nodeId} not found`)
  const attrs = JSON.parse(xml)

  const isTextStyleOnly = Object.keys(attrs).every((k) => TEXT_STYLE_KEYS.has(k))

  if (isTextStyleOnly) {
    const inlineStyle = (node as any).inlineTextStyle
    if (inlineStyle?.id) {
      const textStyle = await (framer as any).getTextStyle?.(inlineStyle.id)
      if (textStyle?.setAttributes) {
        await textStyle.setAttributes(attrs)
        return `Updated TextStyle "${inlineStyle.name}" (${inlineStyle.id}) on node ${nodeId}`
      }
    }
    await node.setAttributes?.(attrs)
    return `Updated node attributes on ${nodeId}`
  }

  if (attrs.text !== undefined && typeof node.setText === "function") {
    await node.setText(attrs.text)
  } else if (attrs.name !== undefined && typeof node.setAttributes === "function") {
    await node.setAttributes(attrs)
  } else {
    await node.setAttributes?.(attrs)
  }
  return `Updated node ${nodeId}`
}

export async function deleteNode({ nodeId }: { nodeId: string }): Promise<string> {
  const node = await (framer as any).getNodeByID?.(nodeId) ?? await resolveNode(nodeId)
  if (!node) throw new Error(`Node ${nodeId} not found`)
  await node.remove?.()
  return `Deleted node ${nodeId}`
}

export async function duplicateNode({ nodeId }: { nodeId: string }): Promise<string> {
  const node = await (framer as any).getNodeByID?.(nodeId) ?? await resolveNode(nodeId)
  if (!node) throw new Error(`Node ${nodeId} not found`)
  const clone = await node.clone?.()
  return JSON.stringify({ id: clone?.id })
}

export async function createPage({ name }: { name: string }): Promise<string> {
  const page = await (framer as any).createPage?.({ name })
  return JSON.stringify({ id: page?.id, name })
}

export async function zoomIntoView({ nodeId }: { nodeId: string }): Promise<string> {
  await (framer as any).zoomIntoView?.(nodeId)
  return `Zoomed into ${nodeId}`
}

// ── CMS ────────────────────────────────────────────────────────────────────

export async function getCMSCollections(): Promise<string> {
  const collections = await (framer as any).cms?.getCollections?.() ?? []
  return JSON.stringify(
    collections.map((c: any) => ({ id: c.id, name: c.name, fields: c.fields })),
    null,
    2
  )
}

export async function getCMSItems({ collectionId }: { collectionId: string }): Promise<string> {
  const collection = await (framer as any).cms?.getCollection?.(collectionId)
  if (!collection) throw new Error(`Collection ${collectionId} not found`)
  const items = await collection.getItems?.() ?? []
  return JSON.stringify(items, null, 2)
}

export async function upsertCMSItem({
  collectionId,
  itemId,
  fields,
}: {
  collectionId: string
  itemId?: string
  fields: Record<string, unknown>
}): Promise<string> {
  const collection = await (framer as any).cms?.getCollection?.(collectionId)
  if (!collection) throw new Error(`Collection ${collectionId} not found`)
  if (itemId) {
    await collection.updateItem?.(itemId, fields)
    return `Updated item ${itemId}`
  } else {
    const item = await collection.addItem?.(fields)
    return JSON.stringify({ id: item?.id })
  }
}

export async function deleteCMSItem({
  collectionId,
  itemId,
}: {
  collectionId: string
  itemId: string
}): Promise<string> {
  const collection = await (framer as any).cms?.getCollection?.(collectionId)
  if (!collection) throw new Error(`Collection ${collectionId} not found`)
  await collection.removeItem?.(itemId)
  return `Deleted item ${itemId}`
}

// ── Code Files ─────────────────────────────────────────────────────────────

export async function readCodeFile({ path }: { path: string }): Promise<string> {
  const file = await (framer as any).getCodeFile?.(path)
  if (!file) throw new Error(`Code file ${path} not found`)
  return file.code ?? file.content ?? ""
}

export async function createCodeFile({
  path,
  content,
}: {
  path: string
  content: string
}): Promise<string> {
  await (framer as any).createCodeFile?.({ name: path, code: content })
  return `Created ${path}`
}

export async function updateCodeFile({
  path,
  content,
}: {
  path: string
  content: string
}): Promise<string> {
  const file = await (framer as any).getCodeFile?.(path)
  if (!file) throw new Error(`Code file ${path} not found`)
  await file.setCode?.(content)
  return `Updated ${path}`
}

export async function exportReactComponents({
  nodeIds,
}: {
  nodeIds?: string[]
}): Promise<string> {
  let nodes: unknown[]
  if (nodeIds?.length) {
    nodes = await Promise.all(
      nodeIds.map((id) => (framer as any).getNodeByID?.(id))
    )
  } else {
    nodes = await (framer as any).getSelectedNodes?.() ?? []
  }
  const exported = await (framer as any).exportReactComponents?.(nodes)
  return typeof exported === "string" ? exported : JSON.stringify(exported, null, 2)
}

export async function getComponentInsertUrlAndTypes(): Promise<string> {
  const data = await (framer as any).getComponentInsertUrlAndTypes?.()
  return JSON.stringify(data, null, 2)
}

// ── Design System ──────────────────────────────────────────────────────────

export async function manageColorStyle(params: {
  action: "create" | "update" | "delete"
  name: string
  color?: string
  styleId?: string
}): Promise<string> {
  const { action, name, color, styleId } = params
  switch (action) {
    case "create": {
      const style = await (framer as any).createColorStyle?.({ name, color })
      return JSON.stringify({ id: style?.id })
    }
    case "update": {
      if (!styleId) throw new Error("styleId required for update")
      const style = await (framer as any).getColorStyle?.(styleId)
      await style?.setAttributes?.({ name, color })
      return `Updated color style ${styleId}`
    }
    case "delete": {
      if (!styleId) throw new Error("styleId required for delete")
      const style = await (framer as any).getColorStyle?.(styleId)
      await style?.remove?.()
      return `Deleted color style ${styleId}`
    }
  }
}

export async function manageTextStyle(params: {
  action: "create" | "update" | "delete"
  name: string
  styleId?: string
  properties?: Record<string, unknown>
}): Promise<string> {
  const { action, name, styleId, properties } = params
  switch (action) {
    case "create": {
      const style = await (framer as any).createTextStyle?.({ name, ...properties })
      return JSON.stringify({ id: style?.id })
    }
    case "update": {
      if (!styleId) throw new Error("styleId required for update")
      const style = await (framer as any).getTextStyle?.(styleId)
      await style?.setAttributes?.({ name, ...properties })
      return `Updated text style ${styleId}`
    }
    case "delete": {
      if (!styleId) throw new Error("styleId required for delete")
      const style = await (framer as any).getTextStyle?.(styleId)
      await style?.remove?.()
      return `Deleted text style ${styleId}`
    }
  }
}

export async function searchFonts({ query }: { query: string }): Promise<string> {
  const fonts = await (framer as any).getFonts?.() ?? []
  const filtered = fonts.filter((f: any) =>
    f.family?.toLowerCase().includes(query.toLowerCase())
  )
  return JSON.stringify(filtered.slice(0, 20), null, 2)
}

export async function inspectFramerApi(): Promise<string> {
  const f = framer as any
  const all: string[] = []
  let obj = f
  while (obj && obj !== Object.prototype) {
    Object.getOwnPropertyNames(obj).forEach((k: string) => { if (!all.includes(k)) all.push(k) })
    obj = Object.getPrototypeOf(obj)
  }
  return JSON.stringify(all.sort(), null, 2)
}

export async function inspectNode({ nodeId }: { nodeId: string }): Promise<string> {
  const node = await resolveNode(nodeId)
  if (!node) throw new Error(`Node ${nodeId} not found`)
  const all: string[] = []
  let obj = node
  while (obj && obj !== Object.prototype) {
    Object.getOwnPropertyNames(obj).forEach((k: string) => { if (!all.includes(k)) all.push(k) })
    obj = Object.getPrototypeOf(obj)
  }
  return JSON.stringify(all.sort(), null, 2)
}

export async function inspectTextStyle({ nodeId }: { nodeId: string }): Promise<string> {
  const node = await resolveNode(nodeId)
  if (!node) throw new Error(`Node ${nodeId} not found`)
  const style = (node as any).inlineTextStyle
  if (!style) return JSON.stringify({ error: "no inlineTextStyle on this node" })
  const textStyle = await (framer as any).getTextStyle?.(style.id)
  const methods: string[] = []
  if (textStyle) {
    let obj = textStyle
    while (obj && obj !== Object.prototype) {
      Object.getOwnPropertyNames(obj).forEach((k: string) => { if (!methods.includes(k)) methods.push(k) })
      obj = Object.getPrototypeOf(obj)
    }
  }
  return JSON.stringify({ inlineTextStyle: style, textStyleMethods: methods.sort() }, null, 2)
}

export async function getProjectWebsiteUrl(): Promise<string> {
  const url = await (framer as any).getProjectWebsiteUrl?.()
  return url ?? "Not published"
}
