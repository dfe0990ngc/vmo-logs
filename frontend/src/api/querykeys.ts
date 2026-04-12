export const qk = {
  users: (filters?: unknown) => filters ? ["users", filters] : ["users"],
  user: (id:number) => ["users", id] as const,
  
  documents: (filters?: unknown) => filters ? ["documents", filters] : ["documents"],
  document: (id:number) => ["documents", id] as const,
  
  audit_trails: (filters?: unknown) => filters ? ["audit_trails", filters] : ["audit_trails"],
  audit_trail: (id:number) => ["audit_trails", id] as const,

  communications: (filters?: unknown) => filters ? ["communications", filters] : ["communications"],
  communication: (id:number) => ["communications", id] as const,
};