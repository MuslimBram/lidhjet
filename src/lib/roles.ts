// Roli i shikuesit: detajet e të regjistruarve (kontakt, email, telefon)
// shfaqen vetëm për "owner" dhe "admin". Kur ndizet Lovable Cloud, roli
// lexohet nga tabela `user_roles` me RLS; deri atëherë lexohet lokalisht.

export type Role = "owner" | "admin" | "user";

const ROLE_KEY = "lidhjet_role_v1";

export function getRole(): Role {
  if (typeof window === "undefined") return "user";
  const r = localStorage.getItem(ROLE_KEY);
  return r === "owner" || r === "admin" ? r : "user";
}

export function setRole(role: Role) {
  try {
    localStorage.setItem(ROLE_KEY, role);
  } catch {}
}

export function canSeeUserDetails(role: Role = getRole()): boolean {
  return role === "owner" || role === "admin";
}
