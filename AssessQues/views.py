# views.py - Django view for AI question generation using Perplexity AI
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
import json
import requests
import os

# Perplexity API Configuration
PERPLEXITY_API_KEY = os.environ.get('PERPLEXITY_API_KEY')
PERPLEXITY_API_URL = "https://api.perplexity.ai/chat/completions"

@csrf_exempt
@require_http_methods(["POST"])
def generate_question(request):
    """
    Generate personalized mental health assessment questions using Perplexity AI
    based on previous conversation history
    """
    try:
        data = json.loads(request.body)
        conversation_history = data.get('conversation_history', [])
        question_number = data.get('question_number', 1)
        total_questions = data.get('total_questions', 10)
        
        # Build context from previous answers
        context = build_conversation_context(conversation_history)
        
        # Generate question using Perplexity AI
        question_data = generate_ai_question(
            context, 
            question_number, 
            total_questions,
            conversation_history
        )
        
        return JsonResponse({
            'success': True,
            'question': question_data['question'],
            'options': question_data['options'],
            'type': question_data['type'],
            'follow_up_areas': question_data.get('follow_up_areas', [])
        })
        
    except Exception as e:
        print(f"Error in generate_question: {str(e)}")
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=500)


def build_conversation_context(conversation_history):
    """Build a summary of previous answers for AI context"""
    if not conversation_history:
        return "This is the first question. Start with a broad assessment."
    
    context_parts = []
    high_stress_areas = []
    
    for entry in conversation_history:
        answer_value = entry.get('answer_value', 0)
        answer_text = entry.get('answer_text', '')
        
        # Identify areas of concern (high values indicate more stress)
        if answer_value >= 30:
            high_stress_areas.append({
                'question': entry.get('question_number'),
                'response': answer_text,
                'severity': answer_value
            })
        
        context_parts.append(
            f"Q{entry.get('question_number')}: "
            f"User responded with '{answer_text}' (stress level: {answer_value}/40)"
        )
    
    context = "\n".join(context_parts)
    
    if high_stress_areas:
        focus_areas = "\n".join([
            f"- High stress in area related to: {area['response']}"
            for area in high_stress_areas
        ])
        context += f"\n\nAreas requiring follow-up:\n{focus_areas}"
    
    return context


def generate_ai_question(context, question_number, total_questions, conversation_history):
    """
    Use Perplexity AI to generate personalized next question
    """
    
    # Determine assessment phase
    if question_number <= 3:
        phase = "initial_broad_assessment"
        instruction = "Ask a general question to understand their overall mental state and identify key areas of concern."
    elif question_number <= 7:
        phase = "deep_dive"
        instruction = "Based on their previous answers, dive deeper into the specific areas showing stress or concern."
    else:
        phase = "wrap_up"
        instruction = "Ask about coping mechanisms, support systems, or any remaining important aspects not yet covered."
    
    system_prompt = """You are a compassionate mental health assessment assistant. Your role is to generate personalized, empathetic questions that help understand someone's mental wellness and stress levels.

Guidelines:
- Be warm, non-judgmental, and supportive
- Ask one clear question at a time
- Build naturally on previous responses
- Focus on actionable areas: sleep, work stress, relationships, self-care, emotions, physical symptoms
- Match the assessment phase (broad → deep dive → wrap-up)"""

    user_prompt = f"""Generate the next question for a mental wellness assessment.

Assessment Progress: Question {question_number} of {total_questions}
Phase: {phase}

Previous Conversation:
{context}

Instructions: {instruction}

Return ONLY a valid JSON object in this exact format (no markdown, no explanation):
{{
    "question": "Your empathetic question here",
    "type": "scale",
    "options": [
        {{"value": 10, "text": "😊 [Positive/low stress response]"}},
        {{"value": 20, "text": "😌 [Moderate/manageable response]"}},
        {{"value": 30, "text": "😕 [High stress/concerning response]"}},
        {{"value": 40, "text": "😔 [Severe/overwhelming response]"}}
    ],
    "follow_up_areas": ["area1", "area2"]
}}

Important:
- Use emojis that match the sentiment
- Make option texts specific to the question
- Ensure options progress from low stress (10) to high stress (40)
- Return ONLY the JSON, no additional text"""

    try:
        print(f"🤖 Calling Perplexity API for question {question_number}...")
        
        # Prepare the API request
        headers = {
            "Authorization": f"Bearer {PERPLEXITY_API_KEY}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "model": "sonar-pro",  # Perplexity's best model
            "messages": [
                {
                    "role": "system",
                    "content": system_prompt
                },
                {
                    "role": "user",
                    "content": user_prompt
                }
            ],
            "temperature": 0.7,
            "max_tokens": 600,
            "return_citations": False,
            "return_images": False
        }
        
        # Call Perplexity API
        response = requests.post(
            PERPLEXITY_API_URL,
            headers=headers,
            json=payload,
            timeout=30
        )
        
        if response.status_code != 200:
            raise Exception(f"Perplexity API error: {response.status_code} - {response.text}")
        
        print(f"✅ Perplexity API responded successfully!")
        
        # Parse response
        response_data = response.json()
        response_text = response_data['choices'][0]['message']['content'].strip()
        
        print(f"📝 AI Generated: {response_text[:100]}...")
        
        # Clean up response if it has markdown code blocks
        if response_text.startswith('```'):
            response_text = response_text.split('```')[1]
            if response_text.startswith('json'):
                response_text = response_text[4:]
            response_text = response_text.strip()
        
        question_data = json.loads(response_text)
        
        # Validate structure
        if not all(key in question_data for key in ['question', 'options']):
            raise ValueError("Invalid question structure from AI")
        
        # Ensure options have correct structure
        if len(question_data['options']) < 4:
            raise ValueError("Not enough options generated")
        
        return question_data
        
    except json.JSONDecodeError as e:
        print(f"❌ JSON parsing error: {e}")
        print(f"Response was: {response_text if 'response_text' in locals() else 'No response'}")
        return generate_fallback_question(question_number, conversation_history)
    except requests.exceptions.RequestException as e:
        print(f"❌ Network error: {e}")
        return generate_fallback_question(question_number, conversation_history)
    except Exception as e:
        print(f"❌ Error generating AI question: {e}")
        return generate_fallback_question(question_number, conversation_history)


def generate_fallback_question(question_number, conversation_history):
    """
    Generate a fallback question if AI fails
    """
    print(f"⚠️ Using fallback question {question_number}")
    
    fallback_questions = [
        {
            "question": "How would you describe your energy levels throughout the day?",
            "options": [
                {"value": 10, "text": "⚡ Full of energy and vitality"},
                {"value": 20, "text": "🔋 Generally good with occasional dips"},
                {"value": 30, "text": "😴 Often feeling tired or drained"},
                {"value": 40, "text": "😵 Constantly exhausted"}
            ]
        },
        {
            "question": "How often do you feel overwhelmed by your responsibilities?",
            "options": [
                {"value": 10, "text": "😊 Rarely, I manage well"},
                {"value": 20, "text": "😌 Sometimes, but I cope"},
                {"value": 30, "text": "😟 Frequently feel overwhelmed"},
                {"value": 40, "text": "😰 Almost always drowning in tasks"}
            ]
        },
        {
            "question": "How would you rate your ability to relax and unwind?",
            "options": [
                {"value": 10, "text": "😌 I relax easily and often"},
                {"value": 20, "text": "🙂 I can relax with some effort"},
                {"value": 30, "text": "😕 Struggling to truly relax"},
                {"value": 40, "text": "😫 Unable to relax at all"}
            ]
        },
        {
            "question": "How connected do you feel to the people around you?",
            "options": [
                {"value": 10, "text": "❤️ Very connected and supported"},
                {"value": 20, "text": "🤝 Moderately connected"},
                {"value": 30, "text": "😔 Somewhat isolated"},
                {"value": 40, "text": "💔 Very lonely and disconnected"}
            ]
        },
        {
            "question": "How often do you experience physical tension or discomfort?",
            "options": [
                {"value": 10, "text": "😌 Rarely have physical symptoms"},
                {"value": 20, "text": "🤕 Occasional tension or headaches"},
                {"value": 30, "text": "😖 Frequent physical discomfort"},
                {"value": 40, "text": "😩 Constant pain or tension"}
            ]
        },
        {
            "question": "How satisfied are you with your work-life balance?",
            "options": [
                {"value": 10, "text": "✨ Very balanced and fulfilled"},
                {"value": 20, "text": "⚖️ Mostly balanced with minor issues"},
                {"value": 30, "text": "😓 Struggling to find balance"},
                {"value": 40, "text": "😫 Completely imbalanced and burnt out"}
            ]
        },
        {
            "question": "How well are you sleeping lately?",
            "options": [
                {"value": 10, "text": "😴 Sleeping soundly and waking refreshed"},
                {"value": 20, "text": "🌙 Decent sleep with minor interruptions"},
                {"value": 30, "text": "😪 Poor sleep quality or difficulty falling asleep"},
                {"value": 40, "text": "😵 Severe insomnia or constant exhaustion"}
            ]
        }
    ]
    
    # Select based on question number to ensure variety
    index = (question_number - 1) % len(fallback_questions)
    question = fallback_questions[index]
    
    return {
        "question": question["question"],
        "type": "scale",
        "options": question["options"],
        "follow_up_areas": []
    }


# For testing purposes
@csrf_exempt
@require_http_methods(["GET"])
def test_perplexity_connection(request):
    """
    Test endpoint to verify Perplexity API is working
    """
    try:
        headers = {
            "Authorization": f"Bearer {PERPLEXITY_API_KEY}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "model": "sonar-pro",
            "messages": [
                {
                    "role": "user",
                    "content": "Say 'Perplexity AI connection successful!' in exactly those words."
                }
            ],
            "max_tokens": 50
        }
        
        response = requests.post(
            PERPLEXITY_API_URL,
            headers=headers,
            json=payload,
            timeout=10
        )
        
        if response.status_code == 200:
            response_data = response.json()
            message = response_data['choices'][0]['message']['content']
            
            return JsonResponse({
                'success': True,
                'message': message,
                'api_working': True,
                'status_code': response.status_code
            })
        else:
            return JsonResponse({
                'success': False,
                'error': f"API returned status {response.status_code}",
                'details': response.text,
                'api_working': False
            }, status=response.status_code)
            
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': str(e),
            'api_working': False
        }, status=500)


# Alternative: Use Perplexity with online search capability
def generate_ai_question_with_search(context, question_number, total_questions, conversation_history):
    """
    Alternative implementation that uses Perplexity's online search capability
    This can provide more up-to-date mental health guidance
    """
    
    payload = {
        "model": "sonar-pro",  # Online model with search
        "messages": [
            {
                "role": "system",
                "content": "You are a mental health assessment assistant with access to latest research."
            },
            {
                "role": "user",
                "content": f"Generate a personalized mental health question based on: {context}"
            }
        ],
        "temperature": 0.7,
        "max_tokens": 600,
        "return_citations": True,  # Get sources for mental health info
        "search_domain_filter": ["who.int", "nimh.nih.gov", "apa.org"]  # Trusted sources only
    }
    
    # Rest of implementation similar to main function
    pass