export const Badge = ({ children }: { children: React.ReactNode }) => {
  return (
    <span className="px-2 py-1 text-xs bg-gray-200 rounded">
      {children}
    </span>
  );
};