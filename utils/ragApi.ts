const SERVER_URL = "https://hyunwoo-ai-backend.fly.dev";

type Source = {
  id: string;
  name: string;
  description: string;
  tags: string[];
  score: number;
};

type RAGQueryResponse = {
  query: string;
  answer: string;
  sources: Source[];
};

export async function queryRAG(
  query: string,
  limit: number = 5
): Promise<RAGQueryResponse> {
  const response = await fetch(`${SERVER_URL}/rag/query`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, limit, stream: false }),
  });

  if (!response.ok) {
    throw new Error(`RAG query failed: ${response.status}`);
  }

  return response.json();
}

export async function* queryRAGStream(
  query: string,
  limit: number = 5
): AsyncGenerator<{ type: "chunk" | "done"; content?: string; sources?: Source[] }, void, unknown> {
  const searchResponse = await fetch(`${SERVER_URL}/rag/search?query=${encodeURIComponent(query)}&limit=${limit}`);
  
  if (!searchResponse.ok) {
    throw new Error(`RAG search failed: ${searchResponse.status}`);
  }
  
  const searchData = await searchResponse.json();
  const sources: Source[] = searchData.results;

  const response = await fetch(`${SERVER_URL}/rag/query`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, limit, stream: true }),
  });

  if (!response.ok) {
    throw new Error(`RAG query failed: ${response.status}`);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("No response body");
  }

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    
    if (done) {
      yield { type: "done", sources };
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (line.startsWith("data: ")) {
        const data = line.slice(6);
        if (data === "[DONE]") {
          yield { type: "done", sources };
          return;
        }
        yield { type: "chunk", content: data };
      }
    }
  }
}

export async function searchRAG(query: string, limit: number = 5): Promise<Source[]> {
  const response = await fetch(
    `${SERVER_URL}/rag/search?query=${encodeURIComponent(query)}&limit=${limit}`
  );

  if (!response.ok) {
    throw new Error(`RAG search failed: ${response.status}`);
  }

  const data = await response.json();
  return data.results;
}

export async function syncRAG(): Promise<{ status: string; synced_count: number }> {
  const response = await fetch(`${SERVER_URL}/rag/sync`, {
    method: "POST",
  });

  if (!response.ok) {
    throw new Error(`RAG sync failed: ${response.status}`);
  }

  return response.json();
}
