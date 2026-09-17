package io.ionize.canvas.blur

import android.content.Context
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Matrix
import android.graphics.RenderEffect
import android.graphics.RenderNode
import kotlin.math.ceil
import android.graphics.Shader
import android.os.Build
import android.view.View
import android.view.ViewTreeObserver
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.views.ExpoView

/** Samples a sibling or another window. An ancestor is always rejected. */
class FrostView(context: Context, appContext: AppContext) : ExpoView(context, appContext) {
  private var targetId: Int? = null
  private var target: CaptureHost? = null
  private var effectNode: RenderNode? = null
  private var paneObserver: ViewTreeObserver? = null
  private val sourceToScreen = Matrix()
  private val paneToScreen = Matrix()
  private val geometry = CaptureGeometry()
  private var intensity = 80f
  private var dark = false
  private var radius = 16f
  private val redraw = ViewTreeObserver.OnPreDrawListener {
    connectTarget()
    val host = target
    if (host != null) {
      if (updateGeometry(host)) invalidate()
    }
    true
  }
  private val sourceRedraw = ViewTreeObserver.OnPreDrawListener {
    redraw.onPreDraw()
    // A retained descendant can change without rerecording CaptureHost itself.
    // Another window needs its own frame to observe that updated RenderNode.
    // This listener is never installed on the pane's window, preventing a loop.
    if (target != null && target?.viewTreeObserver !== paneObserver) invalidate()
    true
  }
  private val frameObservers = CaptureFrameObservers(redraw, sourceRedraw)

  private fun updateGeometry(host: CaptureHost): Boolean {
    sourceToScreen.reset()
    paneToScreen.reset()
    // These native APIs include ancestor transforms, scrolling and each window's
    // screen offset. A location-only translation cannot compensate Entrance scale.
    host.transformMatrixToGlobal(sourceToScreen)
    transformMatrixToGlobal(paneToScreen)
    return geometry.update(sourceToScreen, paneToScreen, width, height, host.width, host.height)
  }

  private fun updateObservers() {
    frameObservers.update(paneObserver, target?.viewTreeObserver)
  }

  init {
    setWillNotDraw(false)
    isClickable = false
    isFocusable = false
    importantForAccessibility = View.IMPORTANT_FOR_ACCESSIBILITY_NO
  }

  fun setTargetId(value: Int?) {
    if (targetId == value) return
    disconnectTarget()
    targetId = value
    connectTarget()
  }

  fun setIntensity(value: Float) {
    intensity = value.coerceIn(0f, 100f)
    updateEffect()
    invalidate()
  }

  fun setTint(value: String) {
    dark = value == "dark"
    invalidate()
  }

  private fun safe(candidate: CaptureHost): Boolean {
    var ancestor = parent
    while (ancestor != null) {
      if (ancestor === candidate) return false
      ancestor = ancestor.parent
    }
    return candidate.isAttachedToWindow
  }

  private fun connectTarget() {
    if (!isAttachedToWindow || Build.VERSION.SDK_INT < 31 || !isHardwareAccelerated) return
    if (target != null) {
      if (!safe(target!!)) disconnectTarget()
      else updateObservers()
      return
    }
    val id = targetId ?: return
    val candidate = appContext.findView<CaptureHost>(id) ?: return
    if (!safe(candidate)) return
    target = candidate
    updateObservers()
    candidate.retain(this)
    effectNode = RenderNode("CanvasFrost").apply { setClipToBounds(false) }
    updateEffect()
    invalidate()
  }

  private fun updateEffect() {
    if (Build.VERSION.SDK_INT < 31) return
    radius = intensity * 0.2f * resources.displayMetrics.density
    effectNode?.setRenderEffect(if (radius > 0f)
      RenderEffect.createBlurEffect(radius, radius, Shader.TileMode.CLAMP) else null)
  }

  private fun disconnectTarget() {
    target?.release(this)
    target = null
    updateObservers()
    effectNode?.discardDisplayList()
    effectNode = null
    geometry.reset()
  }

  override fun onAttachedToWindow() {
    super.onAttachedToWindow()
    CaptureDiagnostics.frostViews++
    if (Build.VERSION.SDK_INT >= 31 && isHardwareAccelerated) {
      paneObserver = viewTreeObserver
      updateObservers()
    }
    connectTarget()
  }

  override fun onDetachedFromWindow() {
    paneObserver = null
    frameObservers.clear()
    disconnectTarget()
    CaptureDiagnostics.frostViews--
    super.onDetachedFromWindow()
  }

  override fun onDraw(canvas: Canvas) {
    super.onDraw(canvas)
    val host = target ?: return
    val source = host.recording ?: return
    val effect = effectNode ?: return
    if (!canvas.isHardwareAccelerated || !source.hasDisplayList() || width <= 0 || height <= 0) return
    updateGeometry(host)
    // Entrance's hidden scale gate is singular. It has no visible drawing space;
    // the observer resumes rendering once that matrix becomes invertible.
    if (!geometry.valid) return
    // Bound each GPU effect to the pane plus its blur support. A small control
    // must not allocate and blur an entire screen-sized offscreen layer.
    val padding = ceil(radius * 3f).toInt()
    val sampleWidth = width + padding * 2
    val sampleHeight = height + padding * 2
    effect.setPosition(-padding, -padding, width + padding, height + padding)
    val sampled = effect.beginRecording(sampleWidth, sampleHeight)
    try {
      sampled.translate(padding.toFloat(), padding.toFloat())
      sampled.concat(geometry.sourceToLocal)
      sampled.drawRenderNode(source)
    } finally { effect.endRecording() }
    val saved = canvas.save()
    canvas.clipRect(0, 0, width, height)
    canvas.drawRenderNode(effect)
    canvas.restoreToCount(saved)
    val opacity = (intensity * 0.65f).toInt().coerceIn(0, 255)
    canvas.drawColor(if (dark) Color.argb(opacity, 18, 24, 35) else Color.argb(opacity, 255, 255, 255))
  }
}
