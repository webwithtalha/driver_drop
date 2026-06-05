export type MessageTemplateVars = {
  driverName: string
  dropNumber: string
  postcode: string
  notes: string
}

export function interpolateMessageTemplate(
  template: string,
  vars: MessageTemplateVars
): string {
  return template
    .replace(/\{\{driverName\}\}/g, vars.driverName)
    .replace(/\{\{dropNumber\}\}/g, vars.dropNumber)
    .replace(/\{\{postcode\}\}/g, vars.postcode)
    .replace(/\{\{notes\}\}/g, vars.notes)
}

export function formatPostcodeWithLocation(
  postcode: string,
  location?: string | null
): string {
  if (location?.trim()) {
    return `${postcode}, ${location.trim()}`
  }
  return postcode
}
