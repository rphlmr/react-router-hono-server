export async function action({ request }: { request: Request }) {
  const formData = await request.formData();

  return {
    value: formData.get("value"),
  };
}

export default function ActionRoute({
  actionData,
}: {
  actionData?: { value: FormDataEntryValue | null };
}) {
  return (
    <div>
      <h1>Action</h1>
      {actionData?.value ? <p>{String(actionData.value)}</p> : null}
      <form method="post">
        <input name="value" />
        <button type="submit">Submit</button>
      </form>
    </div>
  );
}
