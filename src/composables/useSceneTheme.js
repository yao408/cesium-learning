import { ref } from 'vue'

export const currentTheme = ref('tech')

const themes = {
  tech: {
    name: '彩色科技风',
    building: {
      keepOriginalColor: true,
      emissive: '#000000',
      emissiveIntensity: 0,
      metalness: 0.15,
      roughness: 0.85,
      outlineColor: '#4a90ff'
    },
    ground: {
      color: '#0a1628',
      opacity: 0.9,
      transparent: true
    },
    road: {
      mainColor: '#1a2332',
      glowColor: '#000000',
      glowIntensity: 0
    },
    postProcessing: {
      bloomEnabled: false,
      bloomStrength: 0,
      outlineEnabled: true,
      outlineColor: '#4a90ff',
      outlineThickness: 2.0
    },
    lighting: {
      ambientIntensity: 0.45,
      directionalIntensity: 1.0,
      rimLightIntensity: 0.2
    }
  },
  white: {
    name: '白模科技风',
    building: {
      forceColor: '#f8f9fa',
      emissive: '#000000',
      emissiveIntensity: 0,
      metalness: 0.05,
      roughness: 0.65,
      outlineColor: '#555555'
    },
    ground: {
      color: '#e9ecef',
      opacity: 1.0,
      transparent: false
    },
    road: {
      mainColor: '#adb5bd',
      glowColor: '#000000',
      glowIntensity: 0
    },
    postProcessing: {
      bloomEnabled: false,
      bloomStrength: 0,
      outlineEnabled: true,
      outlineColor: '#666666',
      outlineThickness: 1.5
    },
    lighting: {
      ambientIntensity: 0.6,
      directionalIntensity: 0.7,
      rimLightIntensity: 0
    }
  }
}

export function getThemeConfig(themeName) {
  return themes[themeName] || themes.tech
}

export function switchTheme(newTheme) {
  if (!themes[newTheme]) return
  currentTheme.value = newTheme
  
  window.dispatchEvent(new CustomEvent('scene-theme-change', { 
    detail: { theme: newTheme, config: themes[newTheme] }
  }))
}