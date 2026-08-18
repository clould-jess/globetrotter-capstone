export function T({ fr, en }: { fr: string; en: string }) {
  return (
    <>
      <span className="i18n-fr">{fr}</span>
      <span className="i18n-en">{en}</span>
    </>
  );
}
