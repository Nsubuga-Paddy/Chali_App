/**
 * Text Formatting Utilities
 * Removes markdown formatting for cleaner display
 */

/**
 * Strip markdown formatting from text
 * Removes: **bold**, ### headers, *italic*, # tags, etc.
 */
export function stripMarkdown(text: string): string {
  if (!text) return text

  let cleaned = text

  // Remove markdown headers (###, ##, #)
  cleaned = cleaned.replace(/^#{1,6}\s+/gm, '')

  // Remove bold (**text** or __text__)
  cleaned = cleaned.replace(/\*\*(.*?)\*\*/g, '$1')
  cleaned = cleaned.replace(/__(.*?)__/g, '$1')

  // Remove italic (*text* or _text_)
  cleaned = cleaned.replace(/\*(.*?)\*/g, '$1')
  cleaned = cleaned.replace(/_(.*?)_/g, '$1')

  // Remove inline code (`code`)
  cleaned = cleaned.replace(/`([^`]+)`/g, '$1')

  // Remove code blocks (```code```)
  cleaned = cleaned.replace(/```[\s\S]*?```/g, '')

  // Remove links but keep text ([text](url) -> text)
  cleaned = cleaned.replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')

  // Remove images (![alt](url))
  cleaned = cleaned.replace(/!\[([^\]]*)\]\([^\)]+\)/g, '')

  // Remove horizontal rules (---, ***)
  cleaned = cleaned.replace(/^[-*]{3,}$/gm, '')

  // Remove list markers (-, *, +) but keep content
  cleaned = cleaned.replace(/^[\s]*[-*+]\s+/gm, '• ')

  // Remove numbered list markers (1., 2., etc.) but keep content
  cleaned = cleaned.replace(/^\d+\.\s+/gm, '')

  // Clean up multiple newlines (more than 2 consecutive)
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n')

  // Remove leading/trailing whitespace from each line
  cleaned = cleaned.split('\n').map(line => line.trim()).join('\n')

  // Clean up extra spaces
  cleaned = cleaned.replace(/[ \t]+/g, ' ')

  // Remove empty lines at start/end
  cleaned = cleaned.trim()

  return cleaned
}

/**
 * Format text for display (removes markdown, preserves structure)
 */
export function formatForDisplay(text: string): string {
  return stripMarkdown(text)
}

