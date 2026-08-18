import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "supersecretkey_imav_motor_2026";

export interface AuthenticatedRequest extends Request {
  user?: {
    id_usuario: number;
    username: string;
    rol: "ADMINISTRADOR" | "USUARIO" | "LECTURA";
    nombre_completo: string;
  };
}

export const protect = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      token = req.headers.authorization.split(" ")[1];
      const decoded = jwt.verify(token, JWT_SECRET) as any;

      req.user = {
        id_usuario: decoded.id_usuario,
        username: decoded.username,
        rol: decoded.rol,
        nombre_completo: decoded.nombre_completo,
      };

      return next();
    } catch (error) {
      res.status(401).json({ message: "No autorizado, token inválido" });
      return;
    }
  }

  // Si no hay token, lo tratamos como LECTURA por defecto (invitado)
  req.user = {
    id_usuario: 0,
    username: "invitado",
    rol: "LECTURA",
    nombre_completo: "Invitado",
  };
  return next();
};

export const authorize = (...roles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.rol)) {
      res.status(403).json({
        message: `El rol '${req.user?.rol || "INVITADO"}' no tiene permisos para esta acción`,
      });
      return;
    }
    next();
  };
};
