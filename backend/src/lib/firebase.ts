// Firebase Realtime Database REST API (no SDK needed in Workers)
// Workers environment-д firebase-admin SDK ажилладаggүй тул REST ашиглана

export async function firebaseGet(path: string, token: string, dbUrl: string) {
  const res = await fetch(`${dbUrl}/${path}.json?auth=${token}`);
  if (!res.ok) throw new Error(`Firebase GET failed: ${res.status}`);
  return res.json();
}

export async function firebaseSet(
  path: string,
  value: unknown,
  token: string,
  dbUrl: string
) {
  const res = await fetch(`${dbUrl}/${path}.json?auth=${token}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(value),
  });
  if (!res.ok) throw new Error(`Firebase SET failed: ${res.status}`);
  return res.json();
}

export async function firebasePatch(
  path: string,
  value: unknown,
  token: string,
  dbUrl: string
) {
  const res = await fetch(`${dbUrl}/${path}.json?auth=${token}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(value),
  });
  if (!res.ok) throw new Error(`Firebase PATCH failed: ${res.status}`);
  return res.json();
}
