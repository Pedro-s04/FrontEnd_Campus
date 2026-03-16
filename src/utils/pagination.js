export function parsePaginatedData(data, fallbackSize = 10) {
  const source = data ?? []
  if (Array.isArray(source)) {
    return {
      content: source,
      number: 0,
      size: source.length || fallbackSize,
      totalPages: 1,
      totalElements: source.length,
    }
  }

  const content = Array.isArray(source.content) ? source.content : []
  const size = Number(source.size) > 0 ? Number(source.size) : fallbackSize
  const totalElementsRaw = Number(source.totalElements)
  const totalElements = Number.isFinite(totalElementsRaw) ? totalElementsRaw : content.length
  const totalPagesRaw = Number(source.totalPages)
  const totalPages = Number.isFinite(totalPagesRaw) && totalPagesRaw > 0
    ? totalPagesRaw
    : Math.max(Math.ceil(totalElements / size), 1)
  const numberRaw = Number(source.number ?? source.page ?? 0)
  const number = Number.isFinite(numberRaw) && numberRaw >= 0 ? numberRaw : 0

  return { content, number, size, totalPages, totalElements }
}
