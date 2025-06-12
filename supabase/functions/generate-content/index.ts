import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ContentRequest {
  topic: string;
  description: string;
  tone: string;
  audience: string;
  platforms: string[];
  hashtags: string;
  userId?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestData: ContentRequest = await req.json();
    const { topic, description, tone, audience, platforms, hashtags, userId } = requestData;

    const generatedContent = [];
    
    // Initialize Supabase client for RAG queries
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get relevant patterns from RAG knowledge base if userId is provided
    let ragPatterns = '';
    if (userId) {
      const { data: patterns } = await supabase
        .from('rag_knowledge_base')
        .select('successful_pattern, context_metadata, success_rate')
        .eq('user_id', userId)
        .order('success_rate', { ascending: false })
        .order('updated_at', { ascending: false })
        .limit(3);
      
      if (patterns && patterns.length > 0) {
        ragPatterns = `\n\nUser's Successful Content Patterns (use these as inspiration):\n${patterns.map(p => `- ${p.successful_pattern}`).join('\n')}`;
      }
    }

    // Generate content for each platform
    for (const platform of platforms) {
      const systemPrompt = `You are a social media content expert. Generate engaging ${platform} content that is optimized for the platform's specific format and audience.

Platform Guidelines:
- Instagram: Visual-focused, use relevant hashtags, engaging captions
- Facebook: Community-focused, longer form content allowed
- LinkedIn: Professional tone, industry insights, thought leadership
- Twitter/X: Concise, punchy, conversation-starting

Requirements:
- Topic: ${topic}
- Description: ${description}
- Tone: ${tone || 'professional'}
- Target Audience: ${audience || 'general audience'}
- Include relevant hashtags${ragPatterns}

Generate only the post content, no additional explanation.`;

      const userPrompt = `Create a ${platform} post about: ${topic}${description ? '\n\nAdditional context: ' + description : ''}`;

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.7,
          max_tokens: 500,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices[0].message.content;

      // Extract hashtags from the generated content or use provided ones
      const contentHashtags = hashtags.split(/[\s,]+/).filter(tag => tag.trim()) || [];
      
      generatedContent.push({
        platform: platform.charAt(0).toUpperCase() + platform.slice(1),
        content: content,
        hashtags: contentHashtags
      });
    }

    return new Response(
      JSON.stringify({ content: generatedContent }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error generating content:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});