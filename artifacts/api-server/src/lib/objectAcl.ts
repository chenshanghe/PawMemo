import { R2StoredFile } from "./objectStorage";

const ACL_POLICY_METADATA_KEY = "aclpolicy";

export enum ObjectAccessGroupType {}

export interface ObjectAccessGroup {
  type: ObjectAccessGroupType;
  id: string;
}

export enum ObjectPermission {
  READ = "read",
  WRITE = "write",
}

export interface ObjectAclRule {
  group: ObjectAccessGroup;
  permission: ObjectPermission;
}

export interface ObjectAclPolicy {
  owner: string;
  visibility: "public" | "private";
  aclRules?: Array<ObjectAclRule>;
}

function isPermissionAllowed(requested: ObjectPermission, granted: ObjectPermission): boolean {
  if (requested === ObjectPermission.READ) {
    return [ObjectPermission.READ, ObjectPermission.WRITE].includes(granted);
  }
  return granted === ObjectPermission.WRITE;
}

abstract class BaseObjectAccessGroup implements ObjectAccessGroup {
  constructor(public readonly type: ObjectAccessGroupType, public readonly id: string) {}
  public abstract hasMember(userId: string): Promise<boolean>;
}

function createObjectAccessGroup(group: ObjectAccessGroup): BaseObjectAccessGroup {
  switch (group.type) {
    default:
      throw new Error(`Unknown access group type: ${group.type}`);
  }
}

export async function setObjectAclPolicy(objectFile: R2StoredFile, aclPolicy: ObjectAclPolicy): Promise<void> {
  // ACL is tracked at the DB/route level for this app — no-op here
  void objectFile; void aclPolicy;
}

export async function getObjectAclPolicy(objectFile: R2StoredFile): Promise<ObjectAclPolicy | null> {
  const raw = objectFile.customMetadata?.[ACL_POLICY_METADATA_KEY];
  if (!raw) return null;
  try { return JSON.parse(raw) as ObjectAclPolicy; } catch { return null; }
}

export async function canAccessObject({
  userId,
  objectFile,
  requestedPermission,
}: {
  userId?: string;
  objectFile: R2StoredFile;
  requestedPermission: ObjectPermission;
}): Promise<boolean> {
  const aclPolicy = await getObjectAclPolicy(objectFile);
  if (!aclPolicy) return false;
  if (aclPolicy.visibility === "public" && requestedPermission === ObjectPermission.READ) return true;
  if (!userId) return false;
  if (aclPolicy.owner === userId) return true;
  for (const rule of aclPolicy.aclRules || []) {
    const accessGroup = createObjectAccessGroup(rule.group);
    if ((await accessGroup.hasMember(userId)) && isPermissionAllowed(requestedPermission, rule.permission)) return true;
  }
  return false;
}
