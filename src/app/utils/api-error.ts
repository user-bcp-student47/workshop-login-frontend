const PUBLIC_ERROR_MESSAGES = {
  login: 'No se pudo autenticar. Intente nuevamente.',
  tasks: 'No se pudo cargar el dashboard. Intente nuevamente.'
} as const;

export function getApiErrorMessage(_error: unknown, operation: keyof typeof PUBLIC_ERROR_MESSAGES): string {
  return PUBLIC_ERROR_MESSAGES[operation];
}