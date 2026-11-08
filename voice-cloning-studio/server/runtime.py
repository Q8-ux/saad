"""Memory-light gateway entrypoint; never imports speech/model dependencies."""

from gateway import build_gateway
from upstream_proxy import VoiceboxProxy

app = build_gateway(VoiceboxProxy.from_environment())
