import React, { useEffect, useState } from "react";
import { Users, Link2, Copy, Check, Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface Collaborator {
  id: number;
  entryId: number;
  inviteToken: string;
  inviteeName: string | null;
  role: string;
  status: string;
  createdAt: string;
  acceptedAt: string | null;
}

export function CollaboratorsPanel({ entryId }: { entryId: number }) {
  const [collabs, setCollabs] = useState<Collaborator[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteeName, setInviteeName] = useState("");
  const [inviting, setInviting] = useState(false);
  const [latestLink, setLatestLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const load = () => {
    fetch(`${BASE}/api/entries/${entryId}/collaborators`, { credentials: "include" })
      .then(r => r.json())
      .then(d => { setCollabs(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, [entryId]);

  const handleInvite = async () => {
    setInviting(true);
    try {
      const r = await fetch(`${BASE}/api/entries/${entryId}/collaborators/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ inviteeName: inviteeName.trim() || null }),
      });
      const d = await r.json();
      if (d.inviteUrl) {
        setLatestLink(d.inviteUrl);
        setInviteeName("");
        load();
      }
    } finally {
      setInviting(false);
    }
  };

  const copyLink = (url: string) => {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleRemove = async (collabId: number) => {
    await fetch(`${BASE}/api/entries/${entryId}/collaborators/${collabId}`, {
      method: "DELETE",
      credentials: "include",
    });
    setCollabs(c => c.filter(x => x.id !== collabId));
  };

  return (
    <div className="border border-border/40 rounded-2xl p-4 space-y-4">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Users size={16} className="text-orange-500" />
        旅伴共编
      </div>

      <div className="flex gap-2">
        <Input
          placeholder="旅伴昵称（可选）"
          value={inviteeName}
          onChange={e => setInviteeName(e.target.value)}
          className="text-sm"
        />
        <Button size="sm" onClick={handleInvite} disabled={inviting} className="shrink-0 gap-1">
          <Plus size={14} />
          {inviting ? "生成中…" : "生成邀请链接"}
        </Button>
      </div>

      {latestLink && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 flex items-center gap-2 text-sm">
          <Link2 size={14} className="text-orange-500 shrink-0" />
          <span className="flex-1 truncate text-orange-700">{latestLink}</span>
          <button onClick={() => copyLink(latestLink)} className="shrink-0 text-orange-500 hover:text-orange-700">
            {copied ? <Check size={14} /> : <Copy size={14} />}
          </button>
        </div>
      )}

      {!loading && collabs.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs text-muted-foreground">已邀请</div>
          {collabs.map(c => (
            <div key={c.id} className="flex items-center gap-2 text-sm">
              <div className="flex-1 min-w-0">
                <span className="font-medium">{c.inviteeName ?? "匿名旅伴"}</span>
                <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${
                  c.status === "accepted"
                    ? "bg-green-100 text-green-600"
                    : "bg-muted text-muted-foreground"
                }`}>
                  {c.status === "accepted" ? "已接受" : "等待接受"}
                </span>
              </div>
              <button
                onClick={() => copyLink(`${window.location.origin}/collab/${c.inviteToken}`)}
                className="text-muted-foreground hover:text-foreground"
                title="复制邀请链接"
              >
                <Copy size={13} />
              </button>
              <button
                onClick={() => handleRemove(c.id)}
                className="text-muted-foreground hover:text-red-500"
                title="移除"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        分享邀请链接后，对方登录即可协同编辑这篇日记
      </p>
    </div>
  );
}
