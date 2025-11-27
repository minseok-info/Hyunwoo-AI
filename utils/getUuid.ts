import { ParsedUrlQuery } from "querystring";

const getUuid = (
  routerQuery: ParsedUrlQuery
) => {
  const query = routerQuery["uuid"] || null;
  if (!query) return;

  const uuid = Array.isArray(query)
    ? query[0]
    : query;

  return uuid;
}

export default getUuid;