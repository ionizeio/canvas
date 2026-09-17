package io.ionize.canvas.blur

import android.graphics.Matrix
import android.view.View
import android.view.ViewTreeObserver
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class CaptureGeometryTest {
  private fun transform(scale: Float = 1f, x: Float = 0f, y: Float = 0f) = Matrix().apply {
    setValues(floatArrayOf(scale, 0f, x, 0f, scale, y, 0f, 0f, 1f))
  }

  private fun mapped(geometry: CaptureGeometry, x: Float, y: Float): FloatArray = floatArrayOf(x, y).also {
    geometry.sourceToLocal.mapPoints(it)
  }

  @Test
  fun mapsTranslationAndSeparateWindowOffsetsInScreenSpace() {
    val geometry = CaptureGeometry()
    assertTrue(geometry.update(transform(x = 20f, y = 30f), transform(x = 110f, y = 230f), 200, 100, 600, 900))
    assertTrue(geometry.valid)
    val point = mapped(geometry, 150f, 250f)
    assertEquals(60f, point[0], 0.001f)
    assertEquals(50f, point[1], 0.001f)
    assertFalse(geometry.update(transform(x = 20f, y = 30f), transform(x = 110f, y = 230f), 200, 100, 600, 900))
  }

  @Test
  fun holdsBackdropPositionThroughoutPinnedEntranceScale() {
    val geometry = CaptureGeometry()
    for (scale in listOf(0.85f, 0.93f, 1.02f, 1f)) {
      val pane = transform(scale, 100f, 80f)
      assertTrue(geometry.update(transform(), pane, 200, 100, 600, 900))
      val point = mapped(geometry, 250f, 150f)
      assertEquals(150f / scale, point[0], 0.001f)
      assertEquals(70f / scale, point[1], 0.001f)
      pane.mapPoints(point)
      assertEquals(250f, point[0], 0.001f)
      assertEquals(150f, point[1], 0.001f)
    }
  }

  @Test
  fun handlesSourceScaleAndConsumerRotationTogether() {
    val geometry = CaptureGeometry()
    val source = transform(0.8f, 50f, 40f)
    val pane = Matrix().apply { setValues(floatArrayOf(0f, -1f, 100f, 1f, 0f, 20f, 0f, 0f, 1f)) }
    assertTrue(geometry.update(source, pane, 200, 100, 600, 900))
    // Source (100, 25) is screen (130, 60); pane local (40, -30) maps there.
    val point = mapped(geometry, 100f, 25f)
    assertEquals(40f, point[0], 0.001f)
    assertEquals(-30f, point[1], 0.001f)
  }

  @Test
  fun skipsASingularHiddenGateAndResumesWithoutStaleGeometry() {
    val geometry = CaptureGeometry()
    assertTrue(geometry.update(transform(), transform(0f, 100f, 80f), 200, 100, 600, 900))
    assertFalse(geometry.valid)
    assertFalse(geometry.update(transform(), transform(0f, 100f, 80f), 200, 100, 600, 900))
    assertTrue(geometry.update(transform(), transform(0.85f, 100f, 80f), 200, 100, 600, 900))
    assertTrue(geometry.valid)
    assertEquals(150f / 0.85f, mapped(geometry, 250f, 150f)[0], 0.001f)
    assertTrue(geometry.update(transform(), transform(0.85f, 100f, 80f), 240, 100, 600, 900))
    geometry.reset()
    assertFalse(geometry.valid)
    assertTrue(geometry.update(transform(), transform(0.85f, 100f, 80f), 240, 100, 600, 900))
  }

  @Test
  fun rejectsNonFiniteMapping() {
    val geometry = CaptureGeometry()
    assertTrue(geometry.update(transform(x = Float.NaN), transform(), 200, 100, 600, 900))
    assertFalse(geometry.valid)
  }

  @Test
  fun forwardsSeparateWindowFramesWithoutRearmingTheConsumerWindow() {
    InstrumentationRegistry.getInstrumentation().runOnMainSync {
      val context = InstrumentationRegistry.getInstrumentation().targetContext
      val pane = View(context).viewTreeObserver
      val source = View(context).viewTreeObserver
      val initial = CaptureDiagnostics.frameListeners
      var paneFrames = 0
      var sourceFrames = 0
      val listeners = CaptureFrameObservers(
        ViewTreeObserver.OnPreDrawListener { paneFrames++; true },
        ViewTreeObserver.OnPreDrawListener { sourceFrames++; true },
      )
      try {
        listeners.update(pane, pane)
        pane.dispatchOnPreDraw()
        assertEquals(1, paneFrames)
        assertEquals(0, sourceFrames)
        assertEquals(initial + 1, CaptureDiagnostics.frameListeners)
        listeners.update(pane, source)
        source.dispatchOnPreDraw()
        assertEquals(1, sourceFrames)
        pane.dispatchOnPreDraw()
        assertEquals(2, paneFrames)
        assertEquals(1, sourceFrames)
        // A window role change must replace callbacks even when both observer
        // objects are retained; otherwise a pane frame would rearm itself.
        listeners.update(source, pane)
        source.dispatchOnPreDraw()
        assertEquals(3, paneFrames)
        assertEquals(1, sourceFrames)
        pane.dispatchOnPreDraw()
        assertEquals(2, sourceFrames)
        listeners.update(source, source)
        pane.dispatchOnPreDraw()
        assertEquals(2, sourceFrames)
        assertEquals(initial + 1, CaptureDiagnostics.frameListeners)
        listeners.clear()
        pane.dispatchOnPreDraw()
        source.dispatchOnPreDraw()
        assertEquals(3, paneFrames)
        assertEquals(2, sourceFrames)
        assertEquals(initial, CaptureDiagnostics.frameListeners)
      } finally { listeners.clear() }
    }
  }

  @Test
  fun sharesSameWindowObserverAndReleasesReplacedAndDetachedObservers() {
    InstrumentationRegistry.getInstrumentation().runOnMainSync {
      val context = InstrumentationRegistry.getInstrumentation().targetContext
      val pane = View(context).viewTreeObserver
      val source = View(context).viewTreeObserver
      val replacement = View(context).viewTreeObserver
      val initial = CaptureDiagnostics.frameListeners
      var calls = 0
      val listeners = CaptureFrameObservers(ViewTreeObserver.OnPreDrawListener { calls++; true })
      try {
        listeners.update(pane, pane)
        assertEquals(initial + 1, CaptureDiagnostics.frameListeners)
        pane.dispatchOnPreDraw()
        assertEquals(1, calls)
        listeners.update(pane, pane)
        pane.dispatchOnPreDraw()
        assertEquals(2, calls)
        listeners.update(pane, source)
        assertEquals(initial + 2, CaptureDiagnostics.frameListeners)
        source.dispatchOnPreDraw()
        assertEquals(3, calls)
        listeners.update(pane, replacement)
        assertEquals(initial + 2, CaptureDiagnostics.frameListeners)
        source.dispatchOnPreDraw()
        assertEquals(3, calls)
        replacement.dispatchOnPreDraw()
        assertEquals(4, calls)
        listeners.clear()
        assertEquals(initial, CaptureDiagnostics.frameListeners)
        pane.dispatchOnPreDraw()
        replacement.dispatchOnPreDraw()
        assertEquals(4, calls)
        listeners.clear()
        assertEquals(initial, CaptureDiagnostics.frameListeners)
      } finally { listeners.clear() }
    }
  }
}
