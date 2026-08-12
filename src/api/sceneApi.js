const BASE = 'http://localhost:8081/api/scenes'

export async function fetchScenes() {
  const res = await fetch(`${BASE}`)
  if (!res.ok) throw new Error('获取场景列表失败')
  return res.json()
}

export async function fetchScene(id) {
  const res = await fetch(`${BASE}/${id}`)
  if (!res.ok) throw new Error('获取场景失败')
  return res.json()
}

export async function createScene(scene) {
  const res = await fetch(`${BASE}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(scene)
  })
  if (!res.ok) throw new Error('创建场景失败')
  return res.json()
}

export async function updateScene(id, scene) {
  const res = await fetch(`${BASE}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(scene)
  })
  if (!res.ok) throw new Error('更新场景失败')
  return res.json()
}

export async function deleteScene(id) {
  await fetch(`${BASE}/${id}`, { method: 'DELETE' })
}

export async function fetchComponents(sceneId) {
  const res = await fetch(`${BASE}/${sceneId}/components`)
  if (!res.ok) return []
  return res.json()
}

export async function addComponent(sceneId, comp) {
  const res = await fetch(`${BASE}/${sceneId}/components`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(comp)
  })
  return res.json()
}

export async function updateComponent(sceneId, compId, props) {
  const res = await fetch(`${BASE}/${sceneId}/components/${compId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ props })
  })
  return res.json()
}

export async function deleteComponent(sceneId, compId) {
  await fetch(`${BASE}/${sceneId}/components/${compId}`, { method: 'DELETE' })
}