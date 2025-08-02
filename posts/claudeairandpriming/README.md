# Building an AI-Powered Workplace Communication Trainer

## 🚀 Introduction

Have you ever wished you could practice difficult workplace conversations before they happen? [Try this Claude Artifact!](https://claude.ai/public/artifacts/d0ddf233-40cd-40ef-8bfd-6b01cad4e32e) 😁

This proof-of-concept dynamically generate scenarios, and at the end of each session, users receive feedback from three perspectives:
1. **Communication Coach** - Technical skill analysis
2. **Character's Viewpoint** - How the interaction felt
3. **Workplace Dynamics Expert** - Long-term impact assessment

It's just a proof of concept, there's a few bugs lurking around, the selected number of turns is not respected, and sometimes it might break, in that case just refresh the page.

The goals of this prototype was to test out a couple of ideas:
- using Claude *inside* artifacts
- testing the idea of *Random Integer Priming*

Let's dig into the technical details!


## 🧠 How does it work?

### ⚙️ The Scenario Generation Pipeline

1. **Random Seed Generation** → 8 random integers
2. **Word Association** → Claude maps numbers to workplace concepts  
3. **Tree of Thoughts** → 3 scenario branches generated
4. **Self-Evaluation** → Best branch selected
5. **Character Roleplay** → Dynamic conversation begins

### 🔍 Claude AI Inside Artifacts

Asking Claude if you can have a chat with them inside an artifact will yield a negative answer, nope I can't.
While exploring Claude Desktop's debug functionality, using introspection we found JavaScript APIs that is avilable also to artifacts and allow to communicate directly with Claude:

```javascript
// Direct Claude communication
const response = await window.claude.complete(prompt);

// Alternative PostMessage system
self.postMessage({
  type: 'claudeComplete',
  id: uniqueId,
  prompt: yourPrompt
});
```

```javascript
const WorkplaceSkillsTrainer = () => {
  // State management
  const [gameState, setGameState] = useState('menu');
  const [messages, setMessages] = useState([]);
  const [randomSeeds, setRandomSeeds] = useState([]);
  const [maxTurns, setMaxTurns] = useState(3);
  
  // Claude API integration
  const callClaude = async (prompt) => {
    if (window.claude?.complete) {
      return await window.claude.complete(prompt);
    }
    // Fallback to PostMessage system
    return postMessageToClaude(prompt);
  };
```
This revelation opened up possibilities we hadn't imagined - artifacts could now leverage Claude's full conversational abilities in real-time!
There's still quite a bit more to dig into, but being quite excited by this I wanted to share it. 😋



### 🎲 Random Integer Priming

Inspired by Anthropic's research on [subliminal learning in LLMs](https://alignment.anthropic.com/20a25/subliminal-learning/), we implemented a random priming system that seemed to improve the variety of the scenarios presented to the user:

```javascript
// Generate 8 random seeds
const seeds = Array.from({ length: 8 }, () => Math.floor(Math.random() * 1000));

const seedPrompt = `Look at these random numbers: ${randomSeeds.join(', ')}

For EACH number, generate one workplace-related word that somehow connects to that number 
(could be phonetic, visual, conceptual, or abstract connection). Be creative and diverse.

Format: NUMBER: WORD
Example: 742: deadline (7 days, 4 quarters, 2 missed)`;
```

Traditional AI applications can easily fall into predictable patterns. Our random priming approach ensures genuine variety, making each training session unique and valuable.
This ensures every scenario is genuinely unique, breaking LLMs' tendency to fall into repetitive patterns.

### 🌳 Tree of Thoughts

Instead of generating a single scenario, our system:
- **Generates 3 different scenario branches**
- **Scores each on uniqueness and challenge**
- **Self-evaluates to select the optimal training scenario**

```javascript
// Tree of Thoughts prompt structure
"Generate 3 DIFFERENT workplace scenarios...
BRANCH_1: [scenario details]
- UNIQUENESS_SCORE: 8/10
- CHALLENGE_SCORE: 7/10

[AI evaluates and selects best branch]
```

### 🤖 Advanced Meta-Prompting

We crafted sophisticated prompts that guide Claude to maintain character authenticity:

```javascript
"Remember: You ARE ${character}, not an AI assistant."
"Current turn: ${turnCount} of ${maxTurns}"
"React naturally and authentically..."
```

## 🚀 Future Possibilities

This proof-of-concept demonstrates that Claude-powered artifacts can be far more sophisticated than static applications. Potential enhancements include:

- **Scenario Memory**: Track user progress across sessions
- **Improvements Assessment**: Quantitative scoring of communication improvements
- **Team Training**: Multi-user roleplay scenarios
- **Voice Integration**: Practice verbal communication skills


## 🔒 Security Considerations
Users experimenting with this approach should be aware they're using undocumented features that could have unknown security implications, potential data leakage risks, or unexpected behaviors.
This is very much a proof-of-concept that pushes boundaries, not a production-ready system with understood security guarantees. Proceed with appropriate caution and curiosity!
We're operating in uncharted territory here, we discovered these Claude APIs through debug exploration, not official documentation, and we don't fully understand the security model of Claude's artifact sandbox.
The direct pass-through of user inputs to Claude creates obvious prompt injection risks - a user could attempt to break out of the roleplay context, extract system prompts, or potentially access other unexpected functionality.
While we've implemented character-focused meta-prompts, we can't claim that this would mitigate prompt injection, or instead introduce interesting manipulation opportunities. 😉 
The sandbox isolation between the artifacts and the browser environment (and the main Claude conversation or other functionality such as connectors)  remains a black box that we'll likely explore more in the future.

## 📝 Conclusion

By combining Tree of Thoughts prompting, random seed priming, and direct Claude API access, we've created a truly dynamic training tool that adapts to each user.
This project showcases the potential of AI-powered applications that go beyond simple chat interfaces to create genuinely useful, ever-changing experiences.
The complete source code demonstrates how modern AI techniques can be practically applied to solve real-world problems.
Every conversation is unique, every scenario is meaningful, and every practice session helps users build essential workplace communication skills.
