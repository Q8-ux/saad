# مسار السطر الأخير | The Last Line Path

Reusable Arabic/English dialogue-ending review module.

## Usage
```python
from last_line import review_dialogue
print(review_dialogue("سعود: هل انتهى كل شيء؟\nعثمان: لم يبدأ بعد.", theme="البداية", opening="سعود: هذه هي البداية"))
```

No external dependencies. No API keys. No user content sent to external services.

## Integration plan (not yet installed in downstream projects)
| Project | Proposed use | Priority |
|---|---|---|
| Barcode screenplay | Scene/episode closing-line review | P0 |
| أنت الشاعر | Optional ending/callback review for original poems and stories | P1 |
| Dr Noura courses | Teaching examples and dialogue-writing exercises; no public AI text generation | P1 |
| Saad Studio | Optional script review before video production | P2 |
| OpenShorts / video content | Closing CTA/story beat assessment | P2 |

Other projects (legal memo platform, education, chess, supply chain) should NOT use dramatic rewriting by default. Any use requires separate opt-in and domain review.

## Limitations
The heuristic scores are not validated measures of emotional impact. No model-generated alternative endings, UI, API endpoint, or automatic integrations yet. Human editorial review remains mandatory.

## Next steps
1. Add tests and calibrated Arabic/English sample scenes.
2. Expose authenticated API endpoint for authorized projects.
3. Integrate on a feature branch in Barcode first.
4. Run regression and RTL tests before deployment.
