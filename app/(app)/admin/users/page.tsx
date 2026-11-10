import { eq } from "drizzle-orm";
import { Forbidden, PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { can } from "@/lib/rbac";
import { toggleUserActive, updateUser } from "./actions";

const { users, roles, departments } = schema;

export default async function UsersPage() {
  const user = await requireUser();
  if (!can(user, "users:manage")) return <Forbidden permission="users:manage" />;

  const [userRows, roleRows, deptRows] = await Promise.all([
    db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        active: users.active,
        roleId: users.roleId,
        roleName: roles.name,
        departmentId: users.departmentId,
        departmentName: departments.name,
      })
      .from(users)
      .innerJoin(roles, eq(users.roleId, roles.id))
      .leftJoin(departments, eq(users.departmentId, departments.id))
      .orderBy(users.id),
    db.select({ id: roles.id, name: roles.name }).from(roles).orderBy(roles.id),
    db.select().from(departments).orderBy(departments.id),
  ]);

  return (
    <>
      <PageHeader title="Users" description="Role decides what someone can do; department decides whose data they see." />
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[820px] text-sm">
          <thead className="table-head">
            <tr>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Role & department</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {userRows.map((u) => {
              const isMe = u.id === user.id;
              return (
                <tr key={u.id} className={u.active ? "" : "opacity-60"}>
                  <td className="px-4 py-3">
                    <span className="font-medium text-slate-900">
                      {u.name} {isMe && <span className="text-xs font-normal text-slate-400">(you)</span>}
                    </span>
                    <span className="block text-xs text-slate-500">{u.email}</span>
                  </td>
                  <td className="px-4 py-3">
                    {isMe ? (
                      <span>
                        {u.roleName}
                        {u.departmentName && ` · ${u.departmentName}`}
                      </span>
                    ) : (
                      <form key={`${u.roleId}-${u.departmentId}`} action={updateUser} className="flex flex-wrap gap-2">
                        <input type="hidden" name="userId" value={u.id} />
                        <select name="roleId" defaultValue={u.roleId} className="input !w-44 !py-1.5">
                          {roleRows.map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.name}
                            </option>
                          ))}
                        </select>
                        <select name="departmentId" defaultValue={u.departmentId ?? ""} className="input !w-40 !py-1.5">
                          <option value="">No department</option>
                          {deptRows.map((d) => (
                            <option key={d.id} value={d.id}>
                              {d.name}
                            </option>
                          ))}
                        </select>
                        <button className="btn-secondary">Save</button>
                      </form>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={u.active ? "text-emerald-700" : "text-slate-400"}>{u.active ? "Active" : "Deactivated"}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {!isMe && (
                      <form action={toggleUserActive}>
                        <input type="hidden" name="userId" value={u.id} />
                        <button className={u.active ? "btn-danger" : "btn-secondary"}>{u.active ? "Deactivate" : "Activate"}</button>
                      </form>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
