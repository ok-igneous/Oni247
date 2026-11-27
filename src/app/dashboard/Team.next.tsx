"use client";

import { Fragment, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Users, ShieldCheck, Table2 } from "lucide-react";
import { Button } from "../../../components/Button";
import { Badge } from "../../../components/Badge";
import { Input } from "../../../components/Input";
import { Textarea } from "../../../components/Textarea";
import { Skeleton } from "../../../components/Skeleton";
import { Checkbox } from "../../../components/Checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../components/Select";
import { SectionLayout, useSection, type SectionItem } from "../../../components/SectionLayout";
import { Panel, PageHead, Fields, Field } from "../../../components/Panel";
import { useTeam, useTeamAction } from "../../../helpers/useTeam";
import { ACTIONS, BUILT_IN_ROLES, MODULES } from "../../../helpers/permissions";
import type { OutputType, TeamRole } from "../../../endpoints/team/overview_GET.schema";
import styles from "../../../pages/dashboard.team.module.css";

const useRun = () => {
  const act = useTeamAction();
  const run = async (body: Parameters<typeof act.mutateAsync>[0]) => {
    try {
      const res = await act.mutateAsync(body);
      toast.success(res.message);
      return true;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong.");
      return false;
    }
  };
  return { run, busy: act.isPending };
};

const PeopleSection = ({ team }: { team: OutputType }) => {
  const { run, busy } = useRun();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [roleId, setRoleId] = useState(team.roles[0]?.id ?? "");
  const add = async () => {
    if (await run({ op: "member.save", email, displayName: name, roleId })) {
      setEmail("");
      setName("");
    }
  };
  return (
    <>
      <Panel title="Add a person" desc="They sign in with this email address and see only what their role allows. If they have no account yet, they register with the same email." footer={<Button disabled={busy || !email || !roleId} onClick={() => void add()}>Add to team</Button>}>
        <Fields>
          <Field label="Email address"><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" autoComplete="off" /></Field>
          <Field label="Name (optional)"><Input value={name} onChange={(e) => setName(e.target.value)} /></Field>
          <Field label="Role" full>
            <Select value={roleId} onValueChange={setRoleId}>
              <SelectTrigger><SelectValue placeholder="Choose a role" /></SelectTrigger>
              <SelectContent>{team.roles.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
        </Fields>
      </Panel>
      <Panel title={`Your team (${team.members.length})`}>
        {team.members.length === 0 ? (
          <p className={styles.empty}>No one else has access yet. Add a person above and choose what they may do.</p>
        ) : (
          <div className={styles.rows}>
            {team.members.map((m) => (
              <div className={styles.row} key={m.id}>
                <div className={styles.who}>
                  <strong>{m.displayName || m.email}</strong>
                  <span>{m.displayName ? m.email : "No name added"}</span>
                </div>
                <Select value={m.roleId ?? ""} onValueChange={(value) => void run({ op: "member.save", id: m.id, email: m.email, displayName: m.displayName, roleId: value })}>
                  <SelectTrigger aria-label={`Role for ${m.email}`}><SelectValue placeholder="No role" /></SelectTrigger>
                  <SelectContent>{team.roles.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}</SelectContent>
                </Select>
                <div className={styles.rowActions}>
                  {m.status === "active" ? <Badge variant="success">Active</Badge> : m.status === "invited" ? <Badge variant="warning">Waiting to sign up</Badge> : <Badge variant="outline">Paused</Badge>}
                  <Button size="sm" variant="ghost" disabled={busy} onClick={() => void run({ op: "member.status", id: m.id, disabled: m.status !== "disabled" })}>{m.status === "disabled" ? "Restore" : "Pause"}</Button>
                  <Button size="sm" variant="ghost" disabled={busy} onClick={() => void run({ op: "member.remove", id: m.id })}>Remove</Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </>
  );
};

const RoleEditor = ({ role, onDone }: { role: TeamRole | null; onDone: () => void }) => {
  const { run, busy } = useRun();
  const [name, setName] = useState(role?.name ?? "");
  const [description, setDescription] = useState(role?.description ?? "");
  const [perms, setPerms] = useState<Set<string>>(new Set(role?.permissions ?? []));
  const toggle = (key: string, on: boolean) => {
    const next = new Set(perms);
    if (on) next.add(key);
    else next.delete(key);
    setPerms(next);
  };
  const rowAll = (moduleId: string, on: boolean) => {
    const next = new Set(perms);
    for (const a of ACTIONS) (on ? next.add(`${moduleId}.${a.id}`) : next.delete(`${moduleId}.${a.id}`));
    setPerms(next);
  };
  const save = async () => {
    if (await run({ op: "role.save", id: role?.id, name, description, permissions: [...perms] })) onDone();
  };
  let lastGroup = "";
  return (
    <Panel
      title={role ? `Edit ${role.name}` : "New role"}
      desc="Tick what this role may do. “View” opens the page in the menu; the others let them add, change or delete there."
      footer={
        <>
          <Button variant="ghost" onClick={onDone}>Cancel</Button>
          <Button disabled={busy || !name.trim()} onClick={() => void save()}>Save role</Button>
        </>
      }
    >
      <Fields>
        <Field label="Role name"><Input value={name} onChange={(e) => setName(e.target.value)} /></Field>
        <Field label="What this role is for"><Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} /></Field>
      </Fields>
      <div className={styles.matrixWrap}>
        <table className={styles.matrix}>
          <thead>
            <tr>
              <th>Area</th>
              {ACTIONS.map((a) => <th key={a.id}>{a.label}</th>)}
              <th>All</th>
            </tr>
          </thead>
          <tbody>
            {MODULES.map((m) => {
              const head = m.group !== lastGroup;
              lastGroup = m.group;
              const allOn = ACTIONS.every((a) => perms.has(`${m.id}.${a.id}`));
              return (
                <Fragment key={m.id}>
                  {head && <tr key={`g-${m.group}`} className={styles.group}><td colSpan={ACTIONS.length + 2}>{m.group}</td></tr>}
                  <tr>
                    <td>{m.label}</td>
                    {ACTIONS.map((a) => (
                      <td key={a.id}><Checkbox checked={perms.has(`${m.id}.${a.id}`)} onChange={(e) => toggle(`${m.id}.${a.id}`, e.target.checked)} aria-label={`${a.label} ${m.label}`} /></td>
                    ))}
                    <td><Checkbox checked={allOn} onChange={(e) => rowAll(m.id, e.target.checked)} aria-label={`All of ${m.label}`} /></td>
                  </tr>
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </Panel>
  );
};

const RolesSection = ({ team }: { team: OutputType }) => {
  const { run, busy } = useRun();
  const [editing, setEditing] = useState<TeamRole | "new" | null>(null);
  if (editing) return <RoleEditor key={editing === "new" ? "new" : editing.id} role={editing === "new" ? null : editing} onDone={() => setEditing(null)} />;
  return (
    <Panel title="Roles" desc="A role is a set of permissions. Give each person the role that fits their job." actions={<Button size="sm" onClick={() => setEditing("new")}>New role</Button>}>
      <div className={styles.roleList}>
        {team.roles.map((r) => (
          <div className={styles.roleRow} key={r.id}>
            <div>
              <div className={styles.roleName}>
                {r.name}
                {r.isSystem && <Badge variant="secondary">Standard</Badge>}
                <Badge variant="outline">{r.memberCount} {r.memberCount === 1 ? "person" : "people"}</Badge>
              </div>
              <p className={styles.roleDesc}>{r.description || "No description."} {r.permissions.length} permissions.</p>
            </div>
            <div className={styles.rowActions}>
              <Button size="sm" variant="outline" onClick={() => setEditing(r)}>Edit</Button>
              {!r.isSystem && <Button size="sm" variant="ghost" disabled={busy} onClick={() => void run({ op: "role.delete", id: r.id })}>Delete</Button>}
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
};

const ReferenceSection = ({ team }: { team: OutputType }) => {
  let lastGroup = "";
  const letters = (perms: string[], moduleId: string) => ACTIONS.filter((a) => perms.includes(`${moduleId}.${a.id}`)).map((a) => a.label[0]).join("");
  return (
    <>
      <Panel title="Every role in the app" desc="Two roles are fixed. Everything else is a role you create for your shop.">
        <div className={styles.builtin}>
          {BUILT_IN_ROLES.map((r) => (
            <div className={styles.builtinCard} key={r.id}>
              <span className={styles.scope}>{r.scope}</span>
              <h3>{r.name}</h3>
              <p className={styles.roleDesc}>{r.description}</p>
              <ul>{r.can.map((c) => <li key={c}>{c}</li>)}</ul>
            </div>
          ))}
        </div>
      </Panel>
      <Panel title="Who can do what" desc="V view, C create, E edit, D delete. Plan, add-ons and team stay with the owner, always.">
        <div className={styles.matrixWrap}>
          <table className={styles.matrix}>
            <thead>
              <tr>
                <th>Area</th>
                <th>Owner</th>
                {team.roles.map((r) => <th key={r.id}>{r.name}</th>)}
              </tr>
            </thead>
            <tbody>
              {MODULES.map((m) => {
                const head = m.group !== lastGroup;
                lastGroup = m.group;
                return (
                  <Fragment key={m.id}>
                    {head && <tr key={`g-${m.group}`} className={styles.group}><td colSpan={team.roles.length + 2}>{m.group}</td></tr>}
                    <tr>
                      <td>{m.label}</td>
                      <td><span className={styles.dot} aria-label="Everything" /></td>
                      {team.roles.map((r) => {
                        const l = letters(r.permissions, m.id);
                        return <td key={r.id}>{l ? <code>{l}</code> : <span className={`${styles.dot} ${styles.dotOff}`} aria-label="None" />}</td>;
                      })}
                    </tr>
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
};

const SECTIONS: SectionItem[] = [
  { id: "people", label: "People", hint: "Who has access", icon: <Users size={16} /> },
  { id: "roles", label: "Roles", hint: "Create and edit", icon: <ShieldCheck size={16} /> },
  { id: "reference", label: "All permissions", hint: "Every role at a glance", icon: <Table2 size={16} /> },
];

const TeamPage = () => {
  const { data, isFetching, error } = useTeam();
  const [section, setSection] = useSection(SECTIONS);
  return (
    <div className={styles.page}>
      
      <PageHead title="Team and permissions" lead="Give staff their own sign-in and choose exactly what each role can see and change." />
      {isFetching && !data ? (
        <Skeleton style={{ height: 260 }} />
      ) : error || !data ? (
        <p className={styles.empty}>{error instanceof Error ? error.message : "Could not load your team."}</p>
      ) : !data.enabled ? (
        <div className={styles.locked}>
          <strong>The Team add-on is off.</strong>
          <p className={styles.empty}>Switch it on in Add-ons to invite people and set roles.</p>
          <Button asChild><Link href="/dashboard/addons">Open add-ons</Link></Button>
        </div>
      ) : (
        <SectionLayout title="Team" items={SECTIONS.map((s) => (s.id === "people" ? { ...s, badge: data.members.length } : s.id === "roles" ? { ...s, badge: data.roles.length } : s))} value={section} onChange={setSection}>
          {section === "people" && <PeopleSection team={data} />}
          {section === "roles" && <RolesSection team={data} />}
          {section === "reference" && <ReferenceSection team={data} />}
        </SectionLayout>
      )}
    </div>
  );
};

export default TeamPage;

