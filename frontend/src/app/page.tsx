'use client';

import { useEffect, useState } from 'react';
import { ApiKeyInput } from '@/components/api-key-input';
import { ModelSelector } from '@/components/model-selector';
import { ModeSelector } from '@/components/mode-selector';
import { PromptInput } from '@/components/prompt-input';
import { ResultsDisplay } from '@/components/results-display';
import { ProgressIndicator } from '@/components/progress-indicator';
import { useArenaStore } from '@/lib/store';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Moon, Sun } from 'lucide-react';

export default function Home() {
  const { apiKey, selectedModels, mode, status, result } = useArenaStore();
  const [isRunning, setIsRunning] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window === 'undefined') return 'light';
    const storedTheme = window.localStorage.getItem('theme');
    if (storedTheme === 'dark' || storedTheme === 'light') return storedTheme;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  const canStart = apiKey && selectedModels.length >= 2 && mode;

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    window.localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    document.documentElement.classList.toggle('dark', nextTheme === 'dark');
    window.localStorage.setItem('theme', nextTheme);
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-b from-background via-background to-muted/60">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -left-24 top-[-10rem] h-80 w-80 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -right-20 top-24 h-72 w-72 rounded-full bg-chart-2/15 blur-3xl" />
      </div>
      <div className="container mx-auto px-4 py-8">
        <header className="mb-12 text-center">
          <div className="mb-4 flex items-center justify-between">
            <Badge variant="secondary" className="rounded-full px-4 py-1">
              Polymind
            </Badge>
            <Button
              variant="outline"
              size="icon"
              onClick={toggleTheme}
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              suppressHydrationWarning
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
          </div>
          <h1 className="mb-4 bg-gradient-to-r from-foreground via-foreground to-muted-foreground bg-clip-text text-4xl font-extrabold tracking-tight text-transparent md:text-5xl">
            Compare AI Models Like a Pro
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
            Connect multiple AI models and let them debate or vote to find the best answers.
            Select your models, choose a mode, and submit your prompt.
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            <Badge variant="outline" className="rounded-full px-3">30+ Models</Badge>
            <Badge variant="outline" className="rounded-full px-3">Live Debate Flow</Badge>
            <Badge variant="outline" className="rounded-full px-3">
              Selected: {selectedModels.length}
            </Badge>
          </div>
        </header>

        <div className="mx-auto max-w-4xl space-y-8">
          <Card className="border-primary/10 shadow-sm transition-all hover:shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <Badge className="h-6 w-6 justify-center rounded-full p-0">1</Badge>
                Connect OpenRouter
              </CardTitle>
              <CardDescription>Add your OpenRouter API key to load and run models.</CardDescription>
            </CardHeader>
            <CardContent>
              <ApiKeyInput />
            </CardContent>
          </Card>

          <Card className="border-primary/10 shadow-sm transition-all hover:shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <Badge className="h-6 w-6 justify-center rounded-full p-0">2</Badge>
                Select Models
                {selectedModels.length > 0 && (
                  <Badge variant="outline" className="ml-1">
                    {selectedModels.length} selected
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>Pick at least two models to compare debate or voting outcomes.</CardDescription>
            </CardHeader>
            <CardContent>
              <ModelSelector />
            </CardContent>
          </Card>

          <Card className="border-primary/10 shadow-sm transition-all hover:shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <Badge className="h-6 w-6 justify-center rounded-full p-0">3</Badge>
                Choose Mode
              </CardTitle>
              <CardDescription>Use Debate for collaboration or Voting for judged selection.</CardDescription>
            </CardHeader>
            <CardContent>
              <ModeSelector />
            </CardContent>
          </Card>

          <Card className="border-primary/10 shadow-sm transition-all hover:shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <Badge className="h-6 w-6 justify-center rounded-full p-0">4</Badge>
                Enter Your Prompt
              </CardTitle>
              <CardDescription>Ask your question and start the selected workflow.</CardDescription>
            </CardHeader>
            <CardContent>
              <PromptInput disabled={!canStart} onSubmit={() => setIsRunning(true)} />
            </CardContent>
          </Card>

          {isRunning && status && (
            <Card className="border-primary/10 shadow-sm transition-all hover:shadow-md">
              <CardHeader>
                <CardTitle>Session Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <ProgressIndicator status={status} />
              </CardContent>
            </Card>
          )}

          {result && (
            <Card className="border-primary/10 shadow-sm transition-all hover:shadow-md">
              <CardHeader>
                <CardTitle>Results</CardTitle>
              </CardHeader>
              <CardContent>
                <ResultsDisplay result={result} mode={mode} />
              </CardContent>
            </Card>
          )}
        </div>

        <footer className="mt-16 text-center text-sm text-muted-foreground">
          <p>
            Polymind is open source. Use your own OpenRouter API key.
            No data is stored on any server.
          </p>
        </footer>
      </div>
    </main>
  );
}
