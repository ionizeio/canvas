package io.ionize.canvas.blur

import android.os.Build
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class CanvasBlurModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("CanvasBlur")
    Constants("supported" to (Build.VERSION.SDK_INT >= 31))
    Function("getCaptureStats") {
      mapOf(
        "hosts" to CaptureDiagnostics.hosts,
        "activeHosts" to CaptureDiagnostics.activeHosts,
        "recordings" to CaptureDiagnostics.recordings,
        "frostViews" to CaptureDiagnostics.frostViews,
        "frameListeners" to CaptureDiagnostics.frameListeners
      )
    }
    View(PaintHost::class) {
      Name("PaintHost")
      PaintHost.nativePropNames.forEach { name ->
        Prop<Any?>(name) { view: PaintHost, value: Any? -> view.applyNativeProp(name, value) }
      }
      OnViewDestroys { view: PaintHost -> view.dispose() }
    }
    View(CaptureHost::class) {
      Name("CaptureHost")
      Events("onAvailabilityChange")
      Prop("captureEnabled") { view: CaptureHost, enabled: Boolean -> view.setCaptureEnabled(enabled) }
    }
    View(FrostView::class) {
      Name("FrostView")
      Prop("targetId") { view: FrostView, targetId: Int? -> view.setTargetId(targetId) }
      Prop("intensity") { view: FrostView, intensity: Float -> view.setIntensity(intensity) }
      Prop("tint") { view: FrostView, tint: String -> view.setTint(tint) }
    }
  }
}
