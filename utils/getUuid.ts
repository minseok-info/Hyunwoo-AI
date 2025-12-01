import { ParsedUrlQuery } from "querystring";

const getUuid = (
  routerQuery: ParsedUrlQuery,
  callback?: (id: string) => any
): string | undefined => {
  const query = routerQuery["uuid"] || null;
  if (!query) return undefined;
  
  const uuid = Array.isArray(query)
  ? query[0]
  : query;
  
  if (callback) {
    callback(uuid);
  }

  return uuid;
}

export default getUuid;