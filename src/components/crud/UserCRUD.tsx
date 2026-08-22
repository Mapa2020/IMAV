import { useState, useEffect } from "react";
import { useAuth, API_URL } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Edit2, Trash2, ShieldAlert, Key, UserCheck } from "lucide-react";
import { toast } from "sonner";

interface UserRecord {
  id_usuario: number;
  username: string;
  nombre_completo: string;
  rol: "ADMINISTRADOR" | "USUARIO" | "LECTURA";
  id_empleado: number | null;
  nombre_empleado: string | null;
  paterno_empleado: string | null;
  rol_empleado: string | null;
}

interface Employee {
  id_empleado: number;
  nombre: string;
  paterno: string;
  rol: string;
}

export function UserCRUD() {
  const { token, isAdmin, user } = useAuth();
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isOpen, setIsOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRecord | null>(null);

  // Form State
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [nombreCompleto, setNombreCompleto] = useState("");
  const [rol, setRol] = useState<"ADMINISTRADOR" | "USUARIO" | "LECTURA">("LECTURA");
  const [idEmpleado, setIdEmpleado] = useState<string>("none");

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/users`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      } else {
        throw new Error("No se pudo obtener la lista de usuarios");
      }
    } catch (e: any) {
      toast.error("Error al cargar usuarios: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const res = await fetch(`${API_URL}/employees`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setEmployees(data);
      }
    } catch (e: any) {
      console.error("Error al cargar empleados para asociación:", e);
    }
  };

  useEffect(() => {
    if (token && isAdmin) {
      fetchUsers();
      fetchEmployees();
    }
  }, [token, isAdmin]);

  const handleOpenCreate = () => {
    setEditingUser(null);
    setUsername("");
    setPassword("");
    setNombreCompleto("");
    setRol("LECTURA");
    setIdEmpleado("none");
    setIsOpen(true);
  };

  const handleOpenEdit = (user: UserRecord) => {
    setEditingUser(user);
    setUsername(user.username);
    setPassword(""); // Keep blank to not change password
    setNombreCompleto(user.nombre_completo);
    setRol(user.rol);
    setIdEmpleado(user.id_empleado ? user.id_empleado.toString() : "none");
    setIsOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!username.trim() || !nombreCompleto.trim() || !rol) {
      toast.error("Por favor complete todos los campos obligatorios");
      return;
    }

    if (!editingUser && !password.trim()) {
      toast.error("La contraseña es requerida para nuevos usuarios");
      return;
    }

    const payload = {
      username: username.trim(),
      password: password.trim() || undefined,
      nombre_completo: nombreCompleto.trim(),
      rol,
      id_empleado: idEmpleado === "none" ? null : parseInt(idEmpleado, 10),
    };

    try {
      const url = editingUser ? `${API_URL}/users/${editingUser.id_usuario}` : `${API_URL}/users`;
      const method = editingUser ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success(editingUser ? "Usuario actualizado correctamente" : "Usuario creado correctamente");
        setIsOpen(false);
        fetchUsers();
      } else {
        toast.error(data.message || "Error al procesar la solicitud");
      }
    } catch (err: any) {
      toast.error("Error de red: " + err.message);
    }
  };

  const handleDelete = async (id: number) => {
    if (user && user.id_usuario === id) {
      toast.error("No puedes eliminar tu propia cuenta en sesión.");
      return;
    }

    if (!confirm("¿Está seguro de que desea eliminar este usuario?")) return;

    try {
      const res = await fetch(`${API_URL}/users/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (res.ok) {
        toast.success("Usuario eliminado correctamente");
        fetchUsers();
      } else {
        toast.error(data.message || "Error al eliminar usuario");
      }
    } catch (err: any) {
      toast.error("Error de red: " + err.message);
    }
  };

  const filteredUsers = users.filter((u) => {
    const searchLower = search.toLowerCase();
    return (
      u.username.toLowerCase().includes(searchLower) ||
      u.nombre_completo.toLowerCase().includes(searchLower) ||
      u.rol.toLowerCase().includes(searchLower) ||
      (u.nombre_empleado && u.nombre_empleado.toLowerCase().includes(searchLower)) ||
      (u.paterno_empleado && u.paterno_empleado.toLowerCase().includes(searchLower))
    );
  });

  if (!isAdmin) {
    return (
      <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-6 text-center">
        <ShieldAlert className="size-8 text-destructive mx-auto mb-2" />
        <h3 className="text-lg font-semibold text-destructive">Acceso Denegado</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Solo los administradores autorizados pueden gestionar cuentas de usuario.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-xs flex-1">
          <Search className="absolute inset-y-0 left-3 my-auto size-4 text-muted-foreground" />
          <Input
            placeholder="Buscar usuarios..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button onClick={handleOpenCreate} className="flex items-center gap-2">
          <Plus className="size-4" /> Nuevo Usuario
        </Button>
      </div>

      <div className="panel overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">ID</TableHead>
              <TableHead>Nombre de Usuario</TableHead>
              <TableHead>Nombre Completo</TableHead>
              <TableHead>Rol del Sistema</TableHead>
              <TableHead>Empleado Vinculado</TableHead>
              <TableHead className="w-24 text-center">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                  Cargando usuarios del sistema...
                </TableCell>
              </TableRow>
            ) : filteredUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                  No se encontraron usuarios.
                </TableCell>
              </TableRow>
            ) : (
              filteredUsers.map((u) => (
                <TableRow key={u.id_usuario} className={user?.id_usuario === u.id_usuario ? "bg-primary/5" : ""}>
                  <TableCell className="font-mono text-xs">{u.id_usuario}</TableCell>
                  <TableCell className="font-semibold flex items-center gap-1.5">
                    {u.username}
                    {user?.id_usuario === u.id_usuario && (
                      <span className="inline-flex rounded-full bg-primary/10 px-2 py-0.5 text-[9px] font-bold text-primary">
                        Tú
                      </span>
                    )}
                  </TableCell>
                  <TableCell>{u.nombre_completo}</TableCell>
                  <TableCell>
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                      u.rol === "ADMINISTRADOR"
                        ? "bg-destructive/15 text-destructive"
                        : u.rol === "USUARIO"
                          ? "bg-primary/15 text-primary"
                          : "bg-muted text-muted-foreground"
                    }`}>
                      {u.rol}
                    </span>
                  </TableCell>
                  <TableCell>
                    {u.id_empleado ? (
                      <span className="text-xs text-foreground font-medium">
                        {u.nombre_empleado} {u.paterno_empleado} 
                        <span className="text-[10px] text-muted-foreground ml-1">({u.rol_empleado})</span>
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground italic">Sin vincular</span>
                    )}
                  </TableCell>
                  <TableCell className="flex justify-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      onClick={() => handleOpenEdit(u)}
                    >
                      <Edit2 className="size-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 text-destructive hover:bg-destructive/10"
                      onClick={() => handleDelete(u.id_usuario)}
                      disabled={user?.id_usuario === u.id_usuario}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCheck className="size-5 text-primary" />
              {editingUser ? "Editar Usuario" : "Nuevo Usuario"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            <div className="space-y-1">
              <Label htmlFor="username">Nombre de Usuario (Login)</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="ej: javila"
                autoComplete="off"
                required
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="password">
                Contraseña {editingUser && <span className="text-[10px] text-muted-foreground">(Dejar en blanco para no cambiar)</span>}
              </Label>
              <div className="relative">
                <Key className="absolute inset-y-0 left-3 my-auto size-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={editingUser ? "••••••••" : "Ingrese contraseña"}
                  className="pl-9"
                  required={!editingUser}
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="nombre_completo">Nombre Completo</Label>
              <Input
                id="nombre_completo"
                value={nombreCompleto}
                onChange={(e) => setNombreCompleto(e.target.value)}
                placeholder="ej: Javier Avila"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="rol">Rol del Sistema</Label>
                <Select
                  value={rol}
                  onValueChange={(val: any) => setRol(val)}
                >
                  <SelectTrigger id="rol">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LECTURA">LECTURA (Solo ver)</SelectItem>
                    <SelectItem value="USUARIO">USUARIO (Editor)</SelectItem>
                    <SelectItem value="ADMINISTRADOR">ADMINISTRADOR</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="id_empleado">Vincular a Empleado</Label>
                <Select
                  value={idEmpleado}
                  onValueChange={setIdEmpleado}
                >
                  <SelectTrigger id="id_empleado">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Ninguno (Sin vincular)</SelectItem>
                    {employees.map((emp) => (
                      <SelectItem key={emp.id_empleado} value={emp.id_empleado.toString()}>
                        {emp.nombre} {emp.paterno} ({emp.rol})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter className="pt-4 border-t border-border">
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">
                Guardar Cambios
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
