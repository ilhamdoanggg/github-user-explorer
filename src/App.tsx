import { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Star } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useDebounce } from "@/hooks/useDebounce";
import clsx from "clsx";
import { Skeleton } from "@/components/ui/skeleton";
import { baseUrl } from "./lib/utils";

type User = { login: string };
type Repo = { id: number; name: string; description: string; stargazers_count: number; html_url: string };
interface ResultsProps {
  users: User[];
  reposMap: Record<string, Repo[]>;
  loadingRepos: string | null;
  loadRepos: (login: string) => void;
  searchTime: number | null;
  searchTerm: string;
  totalCount: number;
}

interface RepoListProps {
  repos?: Repo[];
  isLoading: boolean;
}

interface SearchBarProps {
  inputRef: React.RefObject<HTMLInputElement>;
  username: string;
  setUsername: (val: string) => void;
  clearSearch: () => void;
}

export default function App() {
  const [username, setUsername] = useState("");
  const debouncedUsername = useDebounce(username, 500);
  const inputRef = useRef<HTMLInputElement>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [reposMap, setReposMap] = useState<Record<string, Repo[]>>({});
  const [totalCount, setTotalCount] = useState(0);
  const [searchTime, setSearchTime] = useState<number | null>(null);
  const [loadingUser, setLoadingUser] = useState(false);
  const [loadingRepos, setLoadingRepos] = useState<string | null>(null);
  const [error, setError] = useState("");

  const searchUsers = async (query: string) => {
    if (!query) return;
    const start = performance.now();
    setLoadingUser(true);
    setError("");
    setUsers([]);
    setReposMap({});
    setSearchTime(null);
    try {
      const res = await axios.get(`${baseUrl}/search/users?q=${query}&per_page=10`);
      setUsers(res.data.items || []);
      setTotalCount(res.data.total_count ?? 0);
      setSearchTime(performance.now() - start);
    } catch {
      setError("Failed to fetch users.");
    } finally {
      setLoadingUser(false);
    }
  };

  const loadRepos = useCallback(async (userLogin: string) => {
    if (reposMap[userLogin]) return;
    setLoadingRepos(userLogin);
    try {
      const res = await axios.get(`${baseUrl}/users/${userLogin}/repos`);
      setReposMap(prev => ({ ...prev, [userLogin]: res.data }));
    } catch {
      setError("Failed to fetch repositories.");
    } finally {
      setLoadingRepos(null);
    }
  }, [reposMap]);

  const clearSearch = () => {
    setUsername("");
    setUsers([]);
    setReposMap({});
    setError("");
    inputRef.current?.focus();
  };

  useEffect(() => {
    if (!debouncedUsername.trim()) {
      clearSearch();
      return;
    }
    searchUsers(debouncedUsername);
  }, [debouncedUsername]);

  const hasResults = users.length > 0 || loadingUser || error;

  return (
    <div className="min-h-screen w-full px-4 sm:px-6 md:px-8 py-6 text-gray-800">
      <div className={clsx("transition-all duration-500 flex flex-col items-center w-full",
        hasResults ? "mt-4 max-w-3xl mx-auto" : "justify-center h-[80vh]")}>
        <h1 className={clsx("text-2xl font-bold mb-6", hasResults && "text-center")}>
          GitHub User Explorer
        </h1>
        <div className="w-full max-w-lg relative mb-2">
          <SearchBar
            inputRef={inputRef}
            username={username}
            setUsername={setUsername}
            clearSearch={clearSearch}
          />
          <Button
            onClick={() => searchUsers(username)}
            disabled={!username.trim()}
            className="w-full max-w-lg bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white mb-6">
            Search
          </Button>
        </div>
        {loadingUser && (
          <div className="w-full space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="border p-4 rounded bg-white shadow-sm">
                <div className="w-1/3 mb-2">
                  <Skeleton data-testid="loading-skeleton-user" className="h-4 w-32" />
                </div>
                <Skeleton data-testid="loading-skeleton-user" className="h-3 w-full" />
              </div>
            ))}
          </div>
        )}

        {error && <p className="text-red-500 text-sm">{error}</p>}

        {users.length > 0 && (
          <Results
            users={users}
            reposMap={reposMap}
            loadingRepos={loadingRepos}
            loadRepos={loadRepos}
            searchTime={searchTime}
            searchTerm={debouncedUsername}
            totalCount={totalCount}
          />
        )}
      </div>
    </div>
  );
}
function SearchBar({ inputRef, username, setUsername, clearSearch, }: SearchBarProps) {
  return (
    <div className="w-full max-w-lg relative mb-2">
      <Input
        ref={inputRef}
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        placeholder="Enter GitHub username"
        className="w-full pr-10"
      />
      {username && (
        <button
          onClick={clearSearch}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          aria-label="Clear input"
        >
          ✕
        </button>
      )}
    </div>
  );
}


function Results({ users, reposMap, loadingRepos, loadRepos, searchTime, searchTerm, totalCount }: ResultsProps) {
  return (
    <div className="w-full">
      {searchTime !== null && (
        <p className="text-xs text-gray-400 mb-2">
          Showing users for "{searchTerm}" completed in {searchTime.toFixed(0)}ms — {totalCount} results
        </p>
      )}
      <Accordion type="single" collapsible className="w-full">
        {users.map((user) => (
          <AccordionItem key={user.login} value={user.login} onClick={() => loadRepos(user.login)}>
            <AccordionTrigger>{user.login}</AccordionTrigger>
            <AccordionContent>
              <RepoList repos={reposMap[user.login]} isLoading={loadingRepos === user.login} />
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}

function RepoList({ repos, isLoading }: RepoListProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="border rounded-lg p-4 bg-white shadow-sm">
            <Skeleton data-testid="loading-skeleton" className="h-4 w-1/2 mb-2" />
            <Skeleton data-testid="loading-skeleton" className="h-3 w-full" />
          </div>
        ))}
      </div>
    );
  }

  if (!repos || repos.length === 0) {
    return <p className="text-sm text-gray-500 italic">No repositories found.</p>;
  }

  return (
    <div className="space-y-3">
      {repos.map((repo) => (
        <div key={repo.id}
            className="border rounded-lg p-4 bg-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <p className="font-bold text-base">
                <a
                  href={repo.html_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline"
                >
                  {repo.name}
                </a>
              </p>
              <div className="flex items-center gap-1 font-bold text-sm text-yellow-500">
                {repo.stargazers_count}
                <Star size={16} className="text-yellow-500 fill-current" />
              </div>
            </div>
            <p className="text-sm text-gray-600 mt-1">{repo.description || "No description"}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

