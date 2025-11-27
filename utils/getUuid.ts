import { ParsedUrlQuery } from "querystring";

const getUuid = (
  routerQuery: ParsedUrlQuery
): string | undefined => {
  const query = routerQuery["uuid"] || null;
  if (!query) return undefined;

  const uuid = Array.isArray(query)
    ? query[0]
    : query;

  return uuid;
}

export default getUuid;