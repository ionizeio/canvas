package io.ionize.canvas.blur

import android.graphics.Matrix
import android.view.ViewTreeObserver

/** Maps recorded source-local pixels into the material's local drawing space. */
internal class CaptureGeometry {
  val sourceToLocal = Matrix()
  private val screenToLocal = Matrix()
  private val values = FloatArray(9)
  private val previous = FloatArray(9)
  private var initialized = false
  private var paneWidth = 0
  private var paneHeight = 0
  private var sourceWidth = 0
  private var sourceHeight = 0
  var valid = false
    private set

  /** True only when geometry changes, never as a request for continuous frames. */
  fun update(sourceToScreen: Matrix, paneToScreen: Matrix, width: Int, height: Int, hostWidth: Int, hostHeight: Int): Boolean {
    var nextValid = width > 0 && height > 0 && hostWidth > 0 && hostHeight > 0 && paneToScreen.invert(screenToLocal)
    if (nextValid) {
      sourceToLocal.setConcat(screenToLocal, sourceToScreen)
      sourceToLocal.getValues(values)
      nextValid = values.all { it.isFinite() }
    }
    val changed = !initialized || valid != nextValid || paneWidth != width || paneHeight != height ||
      sourceWidth != hostWidth || sourceHeight != hostHeight || (nextValid && !values.contentEquals(previous))
    if (nextValid) values.copyInto(previous)
    valid = nextValid
    paneWidth = width
    paneHeight = height
    sourceWidth = hostWidth
    sourceHeight = hostHeight
    initialized = true
    return changed
  }

  fun reset() {
    initialized = false
    valid = false
  }
}

/** One listener per active window, including a separate-window source. */
internal class CaptureFrameObservers(
  private val listener: ViewTreeObserver.OnPreDrawListener,
  private val sourceListener: ViewTreeObserver.OnPreDrawListener = listener,
) {
  private var pane: ViewTreeObserver? = null
  private var source: ViewTreeObserver? = null
  private data class Registration(val observer: ViewTreeObserver, val listener: ViewTreeObserver.OnPreDrawListener)

  fun update(paneObserver: ViewTreeObserver?, sourceObserver: ViewTreeObserver?) {
    val nextPane = paneObserver?.takeIf { it.isAlive }
    val nextSource = sourceObserver?.takeIf { it.isAlive && it !== nextPane }
    if (pane === nextPane && source === nextSource) return
    val before = listOfNotNull(pane?.let { Registration(it, listener) }, source?.let { Registration(it, sourceListener) })
    val after = listOfNotNull(nextPane?.let { Registration(it, listener) }, nextSource?.let { Registration(it, sourceListener) })
    before.filter { it !in after }.forEach {
      if (it.observer.isAlive) it.observer.removeOnPreDrawListener(it.listener)
      CaptureDiagnostics.frameListeners--
    }
    after.filter { it !in before }.forEach {
      it.observer.addOnPreDrawListener(it.listener)
      CaptureDiagnostics.frameListeners++
    }
    pane = nextPane
    source = nextSource
  }

  fun clear() = update(null, null)
}
