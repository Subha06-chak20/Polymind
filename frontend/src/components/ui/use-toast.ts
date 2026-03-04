// Simple toast hook placeholder
export function useToast() {
  return {
    toast: (options: { title?: string; description?: string; variant?: 'default' | 'destructive' }) => {
      console.log('Toast:', options);
    }
  };
}
