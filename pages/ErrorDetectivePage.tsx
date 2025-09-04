import React, { useState } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { LightBulbIcon, BeakerIcon, WrenchScrewdriverIcon, ShieldCheckIcon, DocumentMagnifyingGlassIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

import Page from '../components/Page';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Textarea } from '../components/ui/Textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../components/ui/Form';
import { useToast } from '../hooks/use-toast';
import Spinner from '../components/ui/Spinner';
import { cn } from '../lib/utils';


// --- Co-located AI Configuration & Types ---

if (!process.env.API_KEY) {
    console.warn("API_KEY environment variable not set. Error Detective will not work.");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

const errorDetectiveSystemInstruction = `You are an error detective specialist with expertise in advanced debugging, root cause analysis, error pattern recognition, and intelligent troubleshooting across multiple technology stacks. Your goal is to analyze a given error message or stack trace and provide a detailed, structured investigation report in JSON format.

## Core Expertise
- Root cause analysis and debugging methodologies
- Error pattern recognition and classification
- Stack trace analysis and interpretation
- Memory leak detection and profiling
- Performance bottleneck identification
- Distributed system debugging
- Production incident investigation
- Automated error detection and prevention

## Approach
- Gather comprehensive error context from the provided text.
- Analyze stack traces and error messages.
- Identify patterns and correlations.
- Determine the most likely root cause with supporting evidence.
- Generate a testable hypothesis.
- Provide ranked, actionable solutions with code examples where possible.
- Adhere to strict security rules, never suggesting destructive commands.
- Provide a final, comprehensive report in the specified JSON schema.
`;

const investigationSchema = {
  type: Type.OBJECT,
  properties: {
    pattern: {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING, description: 'The identified error pattern name, e.g., "Null Reference".' },
        commonCauses: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'A list of common causes for this error pattern.' }
      },
    },
    rootCause: {
      type: Type.OBJECT,
      properties: {
        type: { type: Type.STRING, description: 'The type of the root cause, e.g., "null_reference".' },
        description: { type: Type.STRING, description: 'A detailed description of the root cause.' },
        confidence: { type: Type.NUMBER, description: 'Confidence score (0.0 to 1.0) of this root cause analysis.' },
        evidence: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'A list of evidence supporting the root cause finding.' },
      }
    },
    hypothesis: {
      type: Type.OBJECT,
      properties: {
        summary: { type: Type.STRING, description: 'A one-sentence summary of the hypothesis.' },
        explanation: { type: Type.STRING, description: 'A detailed explanation of what is likely happening.' },
        testable: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'A list of concrete, testable actions to verify the hypothesis.' }
      }
    },
    solutions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING, description: 'A title for the proposed solution.' },
          description: { type: Type.STRING, description: 'A detailed description of the solution.' },
          code: { type: Type.STRING, nullable: true, description: 'An optional code snippet demonstrating the solution.' },
        }
      }
    },
  },
  required: ['rootCause', 'hypothesis', 'solutions']
};

interface InvestigationResult {
    pattern?: { name: string; commonCauses: string[] };
    rootCause: { type: string; description: string; confidence: number; evidence: string[] };
    hypothesis: { summary: string; explanation: string; testable: string[] };
    solutions: { title: string; description: string; code?: string }[];
}

const errorAnalysisSchema = z.object({
  errorText: z.string().min(20, 'Please provide a more detailed error message or stack trace.'),
});
type ErrorAnalysisFormData = z.infer<typeof errorAnalysisSchema>;


// --- Feature Component ---

const ErrorDetectivePage: React.FC = () => {
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<InvestigationResult | null>(null);

    const form = useForm<ErrorAnalysisFormData>({
        resolver: zodResolver(errorAnalysisSchema),
        defaultValues: { errorText: '' },
    });

    const onSubmit = async (data: ErrorAnalysisFormData) => {
        if (!process.env.API_KEY) {
            toast({ title: 'API Key Missing', description: 'The Gemini API key is not configured. Please check environment variables.', variant: 'destructive' });
            return;
        }

        setIsLoading(true);
        setAnalysisResult(null);

        try {
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                config: {
                    systemInstruction: errorDetectiveSystemInstruction,
                    responseMimeType: "application/json",
                    responseSchema: investigationSchema,
                },
                contents: `Analyze the following error and provide a detailed investigation report.\n\nError:\n---\n${data.errorText}\n---`,
            });
            
            const resultJson = JSON.parse(response.text);
            setAnalysisResult(resultJson);
        } catch (error: any) {
            console.error("Error calling Gemini API:", error);
            toast({
                title: 'Error during Analysis',
                description: error.message || 'An unexpected error occurred while contacting the AI.',
                variant: 'destructive',
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Page>
            <Card>
                <CardHeader>
                    <CardTitle>AI-Powered Error Detective</CardTitle>
                    <CardDescription>Paste an error message or stack trace below to get a detailed root cause analysis, a testable hypothesis, and actionable solutions.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                            <FormField
                                control={form.control}
                                name="errorText"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel htmlFor="errorText">Error Message / Stack Trace</FormLabel>
                                        <FormControl>
                                            <Textarea id="errorText" {...field} rows={10} placeholder="Paste your error here..." className="font-mono text-sm" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <Button type="submit" isLoading={isLoading}>Analyze Error</Button>
                        </form>
                    </Form>
                </CardContent>
            </Card>

            {isLoading && (
                <div className="mt-6 flex flex-col items-center justify-center text-center">
                    <Spinner />
                    <p className="mt-2 text-text-secondary">The detective is on the case... Analyzing patterns and searching for clues.</p>
                </div>
            )}
            
            {analysisResult && (
                <div className="mt-6 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><DocumentMagnifyingGlassIcon className="h-6 w-6 text-primary" /> Root Cause Analysis</CardTitle>
                            <CardDescription>{analysisResult.rootCause.description}</CardDescription>
                        </CardHeader>
                        <CardContent>
                             <div className="flex items-center gap-2 text-sm">
                                <ShieldCheckIcon className="h-5 w-5 text-secondary" />
                                <strong>Confidence:</strong> 
                                <span className="font-mono">{ (analysisResult.rootCause.confidence * 100).toFixed(0) }%</span>
                            </div>
                            <h4 className="font-semibold mt-4 mb-2">Evidence:</h4>
                            <ul className="list-disc list-inside space-y-1 text-sm bg-background p-3 rounded-md">
                                {analysisResult.rootCause.evidence.map((e, i) => <li key={i}><code className="text-error">{e}</code></li>)}
                            </ul>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><LightBulbIcon className="h-6 w-6 text-accent" /> Hypothesis</CardTitle>
                            <CardDescription>{analysisResult.hypothesis.summary}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm mb-4">{analysisResult.hypothesis.explanation}</p>
                            <h4 className="font-semibold mt-4 mb-2">How to Verify:</h4>
                            <ol className="list-decimal list-inside space-y-2 text-sm">
                                {analysisResult.hypothesis.testable.map((t, i) => <li key={i}>{t}</li>)}
                            </ol>
                        </CardContent>
                    </Card>
                    
                    <div className="space-y-2">
                        <h2 className="text-lg font-semibold flex items-center gap-2"><WrenchScrewdriverIcon className="h-6 w-6 text-secondary" /> Recommended Solutions</h2>
                         {analysisResult.solutions.map((solution, i) => (
                            <Card key={i}>
                                <CardHeader>
                                    <CardTitle className="text-base">{i + 1}. {solution.title}</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm mb-3">{solution.description}</p>
                                    {solution.code && (
                                        <pre className="bg-gray-800 text-white p-3 rounded-md text-xs overflow-x-auto">
                                            <code>{solution.code}</code>
                                        </pre>
                                    )}
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            )}
        </Page>
    );
};

export default ErrorDetectivePage;