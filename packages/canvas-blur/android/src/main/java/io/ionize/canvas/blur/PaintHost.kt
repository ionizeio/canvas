package io.ionize.canvas.blur

import android.content.Context
import android.graphics.Canvas
import android.graphics.Matrix
import android.graphics.drawable.Drawable
import android.view.View
import com.facebook.react.R
import com.facebook.react.bridge.Arguments
import com.facebook.react.uimanager.BackgroundStyleApplicator
import com.facebook.react.uimanager.ReactStylesDiffMap
import com.facebook.react.views.view.ReactViewGroup
import com.facebook.react.views.view.ReactViewManager

internal interface CapturePaintConsumer {
  fun invalidatePaint()
}

/** The ordinary RN paint owner. Only its Drawable, never its children, is sampled. */
class PaintHost(context: Context) : ReactViewGroup(context) {
  companion object {
    private val manager = ReactViewManager()
    internal val nativePropNames: Set<String> get() = manager.nativeProps.keys
  }
  private var captureChild: CapturePaintConsumer? = null
  private val ownerToScreen = Matrix()
  private val targetToScreen = Matrix()
  private val targetToOwner = Matrix()
  private val geometry = CaptureGeometry()

  override fun onViewAdded(child: View) {
    super.onViewAdded(child)
    if (child is CapturePaintConsumer) captureChild = child
  }

  override fun onViewRemoved(child: View) {
    if (captureChild === child) captureChild = null
    super.onViewRemoved(child)
  }

  override fun invalidateDrawable(drawable: Drawable) {
    super.invalidateDrawable(drawable)
    if (drawable === background) captureChild?.invalidatePaint()
  }

  @Suppress("DEPRECATION")
  override fun setBackgroundDrawable(drawable: Drawable?) {
    super.setBackgroundDrawable(drawable)
    captureChild?.invalidatePaint()
  }

  override fun onSizeChanged(w: Int, h: Int, oldw: Int, oldh: Int) {
    super.onSizeChanged(w, h, oldw, oldh)
    captureChild?.invalidatePaint()
  }

  override var overflow: String?
    get() = super.overflow
    set(value) {
      val changed = value != super.overflow
      super.overflow = value
      if (changed) captureChild?.invalidatePaint()
    }

  /** Native prop transactions can change clipping without replacing a Drawable. */
  internal fun paintPropsChanged() { captureChild?.invalidatePaint() }

  internal fun applyNativeProp(name: String, value: Any?) {
    // Expo's generic group manager lacks RN View's border and overflow setters.
    // Delegate to the real manager rather than maintaining a second style map.
    manager.updateProperties(this, ReactStylesDiffMap(Arguments.makeNativeMap(mapOf(name to value))))
    paintPropsChanged()
  }

  internal fun dispose() { manager.onDropViewInstance(this) }

  internal fun drawCapture(canvas: Canvas, target: View, drawContent: (Canvas) -> Unit) {
    ownerToScreen.reset()
    targetToScreen.reset()
    transformMatrixToGlobal(ownerToScreen)
    target.transformMatrixToGlobal(targetToScreen)
    geometry.update(ownerToScreen, targetToScreen, target.width, target.height, width, height)
    if (!geometry.valid || !geometry.sourceToLocal.invert(targetToOwner)) return
    val saved = canvas.save()
    try {
      canvas.concat(geometry.sourceToLocal)
      // The parent's normal draw already owns bounds, alpha, corners and borders.
      // Calling only this Drawable cannot enter the outlet or recurse into target.
      background?.draw(canvas)
      if (overflow != "visible" || getTag(R.id.filter) != null) {
        BackgroundStyleApplicator.clipToPaddingBox(this, canvas)
      }
      canvas.concat(targetToOwner)
      drawContent(canvas)
    } finally { canvas.restoreToCount(saved) }
  }
}
