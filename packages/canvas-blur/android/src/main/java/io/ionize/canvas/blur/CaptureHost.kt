package io.ionize.canvas.blur

import android.content.Context
import android.graphics.Canvas
import android.graphics.RenderNode
import android.os.Build
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.viewevent.EventDispatcher
import expo.modules.kotlin.views.ExpoView

/** A normal React Native parent while idle. Capturing never reparents its children. */
class CaptureHost(context: Context, appContext: AppContext) : ExpoView(context, appContext), CapturePaintConsumer {
  private val onAvailabilityChange by EventDispatcher()
  private var enabled = false
  private val consumers = mutableSetOf<FrostView>()
  private val capture = CaptureSession()
  internal val recording: RenderNode? get() = capture.nodes?.material
  private var countedActive = false

  init {
    // Android skips draw() for an unpainted ViewGroup unless explicitly enabled.
    // The host must record both its authored background and its children.
    setWillNotDraw(false)
    // Match React Native's overflow-visible parent. The outer authored wrapper
    // retains any deliberate clipping; this extra capture parent adds none.
    clipChildren = false
    clipToPadding = false
  }

  fun setCaptureEnabled(value: Boolean) {
    enabled = value
    updateCapture()
  }

  internal fun retain(consumer: FrostView) {
    consumers.add(consumer)
    updateCapture()
  }

  internal fun release(consumer: FrostView) {
    consumers.remove(consumer)
    updateCapture()
  }

  override fun invalidatePaint() {
    if (capture.nodes != null) invalidate()
  }

  private fun updateCapture() {
    val active = enabled && consumers.isNotEmpty() && isAttachedToWindow &&
      isHardwareAccelerated && Build.VERSION.SDK_INT >= 31
    capture.setActive(active)
    if (countedActive != active) {
      CaptureDiagnostics.activeHosts += if (active) 1 else -1
      countedActive = active
      invalidate()
    }
  }

  override fun onAttachedToWindow() {
    super.onAttachedToWindow()
    CaptureDiagnostics.hosts++
    post {
      if (isAttachedToWindow) onAvailabilityChange(mapOf("targetId" to id, "available" to (isHardwareAccelerated && Build.VERSION.SDK_INT >= 31)))
    }
    updateCapture()
  }

  override fun onDetachedFromWindow() {
    // Consumers may detach later in the same commit. Drop GPU data immediately.
    onAvailabilityChange(mapOf("targetId" to id, "available" to false))
    capture.setActive(false)
    if (countedActive) CaptureDiagnostics.activeHosts--
    countedActive = false
    CaptureDiagnostics.hosts--
    super.onDetachedFromWindow()
  }

  override fun draw(canvas: Canvas) {
    val nodes = capture.nodes
    if (nodes == null || !canvas.isHardwareAccelerated || width <= 0 || height <= 0) {
      super.draw(canvas)
      return
    }
    nodes.record(this, parent as? PaintHost) { super.draw(it) }
    CaptureDiagnostics.recordings++
    canvas.drawRenderNode(nodes.content)
    // A dialog can live in another window with an independent redraw schedule.
    consumers.forEach { it.invalidate() }
  }
}

internal object CaptureDiagnostics {
  var hosts = 0
  var activeHosts = 0
  var recordings = 0L
  var frostViews = 0
  var frameListeners = 0
}
