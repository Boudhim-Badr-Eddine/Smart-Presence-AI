import { useAuth } from "@/lib/auth-context"

type Role = "admin" | "trainer" | "student"

interface RoleGuardProps {
  roles: Role[]
  children: React.ReactNode
  fallback?: React.ReactNode
}

/**
 * Component that conditionally renders content based on user role
 */
export function RoleGuard({ roles, children, fallback = null }: RoleGuardProps) {
  const { user } = useAuth()
  
  if (!user || !roles.includes(user.role as Role)) {
    return <>{fallback}</>
  }
  
  return <>{children}</>
}

/**
 * Hook to check if user has specific role(s)
 */
export function useHasRole(roles: Role | Role[]): boolean {
  const { user } = useAuth()
  
  if (!user) return false
  
  const roleArray = Array.isArray(roles) ? roles : [roles]
  return roleArray.includes(user.role as Role)
}

/**
 * Hook to check if user has admin role
 */
export function useIsAdmin(): boolean {
  return useHasRole("admin")
}

/**
 * Hook to check if user has trainer role
 */
export function useIsTrainer(): boolean {
  return useHasRole("trainer")
}

/**
 * Hook to check if user has student role
 */
export function useIsStudent(): boolean {
  return useHasRole("student")
}
