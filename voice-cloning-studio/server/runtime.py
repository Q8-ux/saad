"""Memory-light voice gateway plus bounded ready-voice and YouTube tools."""
from gateway import build_gateway
from upstream_proxy import VoiceboxProxy
from media_service import MediaDispatcher,build_media_app
app=MediaDispatcher(build_gateway(VoiceboxProxy.from_environment()),build_media_app())
