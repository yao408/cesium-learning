import { reactive } from 'vue'

const layerVisible = reactive({
  epicenter: true,
  villages: true,
  watchtowers: true,
  flood: false,
  viewshed: true,
  deyangBoundary: true,
  cityBoundary: true,
})

const layers = [
  { key: 'epicenter', label: '震中', color: '#ef4444' },
  { key: 'flood', label: '洪水', color: '#3380ff' },
  { key: 'villages', label: '村庄', color: '#f97316' },
  { key: 'watchtowers', label: '通视', color: '#a78bfa' },
  { key: 'viewshed', label: '通视线', color: '#4ade80' },
]

export function useLayerVisibility() {
  function toggleLayer(layer) {
    layerVisible[layer.key] = !layerVisible[layer.key]
  }

  return {
    layerVisible,
    layers,
    toggleLayer,
  }
}