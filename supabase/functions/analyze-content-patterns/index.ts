import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { contentId, userId } = await req.json();
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the approved content details
    const { data: content, error: contentError } = await supabase
      .from('content_generations')
      .select(`
        *,
        social_media_accounts(platform)
      `)
      .eq('id', contentId)
      .eq('user_id', userId)
      .single();

    if (contentError || !content) {
      throw new Error('Content not found');
    }

    // Use AI to analyze the content and extract patterns
    const analysisPrompt = `Analyze this approved social media content and extract successful patterns:

Platform: ${content.social_media_accounts.platform}
Topic: ${content.topic}
Content: ${content.generated_content}
Tone: ${content.tone || 'N/A'}
Audience: ${content.audience || 'N/A'}

Extract and identify:
1. Writing style patterns (tone, voice, structure)
2. Engagement elements (hooks, calls-to-action, emotional triggers)
3. Content structure patterns (length, formatting, hashtag usage)
4. Topic approach patterns (how the topic was handled)

Provide a concise pattern description (max 500 chars) that captures the essence of what made this content successful for future content generation.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are a content analysis expert. Extract actionable patterns from successful social media content.' },
          { role: 'user', content: analysisPrompt }
        ],
        temperature: 0.3,
        max_tokens: 300,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const pattern = data.choices[0].message.content;

    // Store the pattern in the RAG knowledge base
    const { error: insertError } = await supabase
      .from('rag_knowledge_base')
      .insert({
        user_id: userId,
        platform: content.social_media_accounts.platform.toLowerCase(),
        content_type: content.topic.toLowerCase(),
        successful_pattern: pattern,
        context_metadata: {
          original_content_id: contentId,
          topic: content.topic,
          tone: content.tone,
          audience: content.audience,
          content_length: content.generated_content.length,
          hashtag_count: content.metadata?.hashtags?.length || 0
        },
        usage_count: 1,
        success_rate: 1.0
      });

    if (insertError) {
      console.error('Error storing pattern:', insertError);
      throw new Error('Failed to store pattern');
    }

    console.log(`Pattern stored for user ${userId}, platform ${content.social_media_accounts.platform}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        pattern: pattern.substring(0, 100) + '...' // Return truncated pattern for confirmation
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error analyzing content patterns:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});