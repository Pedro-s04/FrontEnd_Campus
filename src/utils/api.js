export const getApiError = (err, fallback) =>
  err.response?.data?.error?.message || err.response?.data?.message || fallback

export const getValidationDetail = (err) =>
  err.response?.data?.error?.details?.[0]?.message
