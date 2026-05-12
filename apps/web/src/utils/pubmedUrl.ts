/** Official PubMed article page for a PMID. */
export function pubmedArticleUrl(pmid: string): string {
  const id = pmid.replace(/\D/g, '');
  return id ? `https://pubmed.ncbi.nlm.nih.gov/${id}/` : 'https://pubmed.ncbi.nlm.nih.gov/';
}
