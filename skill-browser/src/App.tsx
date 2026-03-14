import { useCallback, useEffect, useRef, useState } from "react";
import { listSkills, searchSkills, type Skill } from "./api";

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

function SkillCard({ skill }: { skill: Skill }) {
  return (
    <div className="border border-stone-200 rounded-xl p-5 hover:shadow-md transition-shadow bg-white">
      <div className="flex items-start justify-between mb-2">
        <h3 className="font-semibold text-stone-900 text-lg">
          {skill.displayName || skill.slug}
        </h3>
        {skill.latestVersion && (
          <span className="text-xs font-mono text-orange-600 bg-orange-50 px-2 py-0.5 rounded">
            v{skill.latestVersion.version}
          </span>
        )}
      </div>
      <p className="text-sm font-mono text-stone-400 mb-2">{skill.slug}</p>
      {skill.summary && (
        <p className="text-sm text-stone-500 line-clamp-2 leading-relaxed">
          {skill.summary}
        </p>
      )}
      <div className="mt-3 flex items-center justify-between text-xs text-stone-400">
        <span>{timeAgo(skill.updatedAt)}</span>
        <code className="text-orange-600 bg-orange-50 px-2 py-0.5 rounded text-xs">
          clawhub install {skill.slug}
        </code>
      </div>
    </div>
  );
}

export default function App() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const loadSkills = useCallback(async (reset = false) => {
    setLoading(true);
    try {
      if (query.trim()) {
        const results = await searchSkills(query, 50);
        setSkills(results.map((r) => ({ ...r, tags: [], stats: {}, createdAt: r.updatedAt ?? 0, updatedAt: r.updatedAt ?? 0 })));
        setHasMore(false);
      } else {
        const c = reset ? undefined : cursor ?? undefined;
        const data = await listSkills(30, c);
        setSkills((prev) => (reset ? data.items : [...prev, ...data.items]));
        setCursor(data.nextCursor);
        setHasMore(data.nextCursor !== null);
      }
    } finally {
      setLoading(false);
    }
  }, [query, cursor]);

  useEffect(() => {
    loadSkills(true);
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setCursor(null);
      setHasMore(true);
      loadSkills(true);
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <header className="bg-white border-b border-stone-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center gap-6">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🐾</span>
            <h1 className="text-xl font-bold text-stone-900">ClawChat Skills</h1>
          </div>
          <div className="flex-1 max-w-xl">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="搜索技能..."
              className="w-full px-4 py-2.5 rounded-lg border border-stone-300 bg-stone-50 text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition"
            />
          </div>
          <div className="text-sm text-stone-400">
            {skills.length} skills
          </div>
        </div>
      </header>

      {/* Grid */}
      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {skills.map((skill) => (
            <SkillCard key={skill.slug} skill={skill} />
          ))}
        </div>

        {/* Load more */}
        {hasMore && !loading && (
          <div className="mt-8 text-center">
            <button
              onClick={() => loadSkills(false)}
              className="px-6 py-2.5 rounded-lg bg-stone-900 text-white font-medium hover:bg-stone-800 transition"
            >
              加载更多
            </button>
          </div>
        )}

        {loading && (
          <div className="mt-8 text-center text-stone-400">加载中...</div>
        )}

        {!loading && skills.length === 0 && (
          <div className="mt-16 text-center text-stone-400 text-lg">
            没有找到匹配的技能
          </div>
        )}
      </main>
    </div>
  );
}
