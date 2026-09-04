#!/usr/bin/env bash
set -euo pipefail
OUT="${1:-_site/english-kuwait/audio}"
mkdir -p "$OUT"
# Clearer classroom-style eSpeak settings: British English, slower pace, lower pitch.
make_audio(){
  local name="$1"; shift
  local text="$*"
  espeak -v en-gb -s 118 -p 42 -a 175 -g 7 -w "$OUT/$name.wav" "$text"
}
make_audio 6-1-listen "Hello! My name is Yousef. I am twelve years old. I live in Kuwait. I usually play football after school, and I sometimes read English stories."
make_audio 6-1-speak "I usually study English after school."
make_audio 6-2-listen "Our school starts at seven thirty. We have English three times a week. My favourite subject is science, because I enjoy experiments."
make_audio 6-2-speak "My favourite subject is English, because it is useful."
make_audio 6-3-listen "To stay healthy, drink enough water. Eat fresh food. Sleep well, and exercise regularly."
make_audio 6-3-speak "I drink enough water every day."
make_audio 7-1-listen "Last weekend, Sara visited Kuwait Towers with her family. They took photos, and learned interesting facts about Kuwait."
make_audio 7-1-speak "Last weekend, I visited my grandparents."
make_audio 7-2-listen "Fahad thinks travelling by plane is faster than travelling by car. But he enjoys road trips, because he can see more places."
make_audio 7-2-speak "Travelling by plane is faster than travelling by car."
make_audio 7-3-listen "When you use the internet, you must protect your password. You must not share private information with strangers."
make_audio 7-3-speak "I must keep my password private."
make_audio 8-1-listen "Kuwait is developing new projects for the future. Many young people are going to study technology, and help create sustainable solutions."
make_audio 8-1-speak "I am going to learn new digital skills."
make_audio 8-2-listen "If we reduce waste, and recycle more, we will help protect the environment for future generations."
make_audio 8-2-speak "If I recycle, I will help the environment."
make_audio 8-3-listen "Mariam has used English websites to research school projects. She has also learned to check whether online sources are reliable."
make_audio 8-3-speak "I have used English to search for information."
make_audio 9-1-listen "Ali wants to become an engineer. He enjoys solving problems, and plans to improve his English, because it will help him at university."
make_audio 9-1-speak "I want to improve my English to achieve my goals."
make_audio 9-2-listen "New medicines are tested carefully before they are used. Scientists collect evidence, and study the results."
make_audio 9-2-speak "Scientific results are checked carefully."
make_audio 9-3-listen "Our teacher said that English helps us communicate with people around the world. She told us to practise speaking every day."
make_audio 9-3-speak "My teacher told me to practise English every day."
