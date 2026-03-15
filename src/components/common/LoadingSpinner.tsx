interface Props {
  size?: 'sm' | 'md' | 'lg';
  color?: string;
}

export function LoadingSpinner({ size = 'md', color = 'border-purple-500' }: Props) {
  const sizeClass = { sm: 'w-4 h-4 border-2', md: 'w-8 h-8 border-3', lg: 'w-12 h-12 border-4' }[size];
  return (
    <div
      className={`${sizeClass} ${color} border-t-transparent rounded-full animate-spin`}
      role="status"
      aria-label="Loading"
    />
  );
}
