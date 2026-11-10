import { eq } from "drizzle-orm";
import { Forbidden, PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { can } from "@/lib/rbac";
import { changeUserRole, toggleUserActive } from "../actions";

const { users, roles } = schema;

export default async function UsersPage() {
  const user = await requireUser();
  if (!can(user, "users:manage")) return <Forbidden permission="users:manage" />;

  const [userRows, roleRows] = await Promise.all([
    db
      .select({ id: users.id, name: users.name, email: users.email, active: users.active, roleId: users.roleId, roleName: roles.name })
      .from(users)
      .innerJoin(roles, eq(users.roleId, roles.id))
      .orderBy(users.id),
    db.select({ id: roles.id, name: roles.name }).from(roles).orderBy(roles.id),
  ]);

  return (
    <>
      <PageHeader title="Users" description="Change a user's role and their access changes on their next click." />
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="table-head">
            <tr>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {userRows.map((u) => {
              const isMe = u.id === user.id;
              return (
                <tr key={u.id}>
                  <td className="px-4 py-3">
                    <span className="font-medium text-slate-900">
                      {u.name} {isMe && <span className="text-xs font-normal text-slate-400">(you)</span>}
                    </span>
                    <span className="block text-xs text-slate-500">{u.email}</span>
                  </td>
                  <td className="px-4 py-3">
                    {isMe ? (
                      <span className="text-slate-700">{u.roleName}</span>
                    ) : (
                      <form action={changeUserRole} className="flex gap-2">
                        <input type="hidden" name="userId" value={u.id} />
                        <select name="roleId" defaultValue={u.roleId} className="input !w-40 !py-1.5">
                          {roleRows.map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.name}
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
