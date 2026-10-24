import { Request, Response, NextFunction } from 'express';
import { supabase } from '../config/supabase.js';

// Extend Express Request type to carry the authenticated user profile
export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

/**
 * Middleware: Verifies the Supabase JWT Bearer token from the Authorization header.
 * Rejects requests with 401 Unauthorized if missing, malformed, or expired.
 */
export async function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      error: 'Access denied: Missing authentication token. Please provide a valid Bearer token.',
      code: 'UNAUTHORIZED'
    });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    // 1. Verify token with Supabase Auth
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !authUser) {
      res.status(401).json({
        error: 'Access denied: Invalid or expired authentication token.',
        code: 'TOKEN_INVALID'
      });
      return;
    }

    // 2. Fetch user's assigned role from public.users table
    const { data: profile } = await supabase
      .from('users')
      .select('id, email, role')
      .eq('email', authUser.email)
      .single();

    req.user = {
      id: authUser.id,
      email: authUser.email || '',
      role: profile?.role || 'staff' // default fallback
    };

    next();
  } catch (err: any) {
    res.status(500).json({ error: 'Internal security authentication error.', details: err.message });
  }
}

/**
 * Middleware Factory: Enforces Role-Based Access Control (RBAC).
 * Rejects with 403 Forbidden if user's role is not authorized for the requested endpoint.
 */
export function requireRole(allowedRoles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Access denied: User not authenticated.' });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        error: `Forbidden: Your role '${req.user.role}' lacks permission to perform this action. Required role(s): [${allowedRoles.join(', ')}].`,
        code: 'ROLE_FORBIDDEN'
      });
      return;
    }

    next();
  };
}
