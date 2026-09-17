package io.ionize.canvas.blur

import android.content.Context
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.ColorSpace
import android.graphics.HardwareRenderer
import android.graphics.Paint
import android.graphics.PixelFormat
import android.graphics.RenderNode
import android.hardware.HardwareBuffer
import android.media.ImageReader
import android.os.Handler
import android.os.Looper
import android.os.Build
import android.util.Log
import android.view.View
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import androidx.test.platform.graphics.HardwareRendererCompat
import com.facebook.react.bridge.Arguments
import com.facebook.react.soloader.OpenSourceMergedSoMapping
import com.facebook.react.uimanager.DisplayMetricsHolder
import com.facebook.react.uimanager.ReactStylesDiffMap
import com.facebook.react.views.view.ReactViewGroup
import com.facebook.react.views.view.ReactViewManager
import com.facebook.soloader.SoLoader
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit
import java.io.File
import java.time.Duration
import kotlin.math.abs
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class CapturePaintTest {
  private val instrumentation = InstrumentationRegistry.getInstrumentation()
  private val context get() = instrumentation.targetContext
  private val width = 100
  private val height = 100
  private val fill = Color.argb(128, 230, 90, 40)

  private class Content(context: Context) : View(context), CapturePaintConsumer {
    var paintNotifications = 0
    private val ink = Paint().apply { color = Color.BLUE }
    override fun invalidatePaint() { paintNotifications++ }
    override fun draw(canvas: Canvas) {
      // The stripe intentionally crosses the content inset and outer border.
      canvas.drawRect(-16f, 34f, 88f, 42f, ink)
    }
  }

  @Before
  fun initializeReactNative() {
    SoLoader.init(context, OpenSourceMergedSoMapping)
    DisplayMetricsHolder.initDisplayMetricsIfNotInitialized(context)
  }

  private fun styles(hidden: Boolean, color: Int = fill): Map<String, Any?> {
    val density = context.resources.displayMetrics.density
    return mapOf(
      "backgroundColor" to color.toDouble(),
      "borderWidth" to (10.0 / density),
      "borderColor" to Color.TRANSPARENT.toDouble(),
      "borderTopLeftRadius" to (30.0 / density),
      "borderTopRightRadius" to (8.0 / density),
      "borderBottomLeftRadius" to (20.0 / density),
      "borderBottomRightRadius" to (4.0 / density),
      "overflow" to if (hidden) "hidden" else "visible",
    )
  }

  private fun paintHost(hidden: Boolean): Pair<PaintHost, Content> {
    val owner = PaintHost(context)
    styles(hidden).forEach { (name, value) -> owner.applyNativeProp(name, value) }
    val child = Content(context)
    owner.addView(child)
    owner.layout(0, 0, width, height)
    child.layout(10, 10, 90, 90)
    // Android initializes Drawable bounds in its normal visible draw.
    owner.draw(Canvas(Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)))
    return Pair(owner, child)
  }

  private fun ordinary(hidden: Boolean, color: Int = fill): Bitmap {
    lateinit var owner: ReactViewGroup
    instrumentation.runOnMainSync {
      owner = ReactViewGroup(context)
      ReactViewManager().updateProperties(owner, ReactStylesDiffMap(Arguments.makeNativeMap(styles(hidden, color))))
      val child = Content(context)
      owner.addView(child)
      owner.layout(0, 0, width, height)
      child.layout(10, 10, 90, 90)
    }
    // Compare the ordinary RN owner and the sample on the same GPU backend.
    return hardware { owner.draw(it) }
  }

  private fun hardware(draw: (Canvas) -> Unit): Bitmap {
    val drawingEnabled = HardwareRendererCompat.isDrawingEnabled()
    HardwareRendererCompat.setDrawingEnabled(true)
    val node = RenderNode("CanvasPaintTest").apply {
      setPosition(0, 0, this@CapturePaintTest.width, this@CapturePaintTest.height)
    }
    assertEquals(width, node.width)
    assertEquals(height, node.height)
    instrumentation.runOnMainSync {
      val canvas = node.beginRecording(width, height)
      try { draw(canvas) } finally { node.endRecording() }
    }
    val reader = ImageReader.newInstance(width, height, PixelFormat.RGBA_8888, 1,
      HardwareBuffer.USAGE_GPU_SAMPLED_IMAGE or HardwareBuffer.USAGE_GPU_COLOR_OUTPUT)
    val available = CountDownLatch(1)
    reader.setOnImageAvailableListener({ available.countDown() }, Handler(Looper.getMainLooper()))
    val renderer = HardwareRenderer()
    try {
      renderer.setSurface(reader.surface)
      renderer.setContentRoot(node)
      renderer.isOpaque = false
      assertEquals(HardwareRenderer.SYNC_OK, renderer.createRenderRequest().setWaitForPresent(true).syncAndDraw())
      assertTrue("Hardware output was not presented", available.await(5, TimeUnit.SECONDS))
      val image = requireNotNull(reader.acquireNextImage())
      image.use {
        if (Build.VERSION.SDK_INT >= 33) {
          it.fence.use { fence ->
            if (fence.isValid) assertTrue("GPU producer fence did not signal", fence.await(Duration.ofSeconds(5)))
          }
        }
        val buffer = requireNotNull(it.hardwareBuffer)
        buffer.use {
          val hardware = requireNotNull(Bitmap.wrapHardwareBuffer(it, ColorSpace.get(ColorSpace.Named.SRGB)))
          return requireNotNull(hardware.copy(Bitmap.Config.ARGB_8888, false)).also { hardware.recycle() }
        }
      }
    } finally {
      renderer.destroy()
      reader.close()
      node.discardDisplayList()
      HardwareRendererCompat.setDrawingEnabled(drawingEnabled)
    }
  }

  private fun assertPixels(expected: Bitmap, actual: Bitmap) {
    var mismatches = 0
    for (y in 0 until height) for (x in 0 until width) {
      val a = expected.getPixel(x, y)
      val b = actual.getPixel(x, y)
      // Keep a bounded rounding allowance while comparing every pixel.
      if (listOf(24, 16, 8, 0).any { abs(((a ushr it) and 255) - ((b ushr it) and 255)) > 8 }) mismatches++
    }
    val samples = listOf(0 to 0, 50 to 5, 50 to 25, 5 to 47, 50 to 47, 50 to 75).joinToString {
      val (x, y) = it
      "($x,$y) expected=${Integer.toHexString(expected.getPixel(x, y))} actual=${Integer.toHexString(actual.getPixel(x, y))}"
    }
    if (mismatches != 0) {
      val directory = File(context.getExternalFilesDir(null), "canvas-capture-pixels/${System.nanoTime()}").apply { mkdirs() }
      for ((name, bitmap) in listOf("expected" to expected, "actual" to actual)) {
        File(directory, "$name.png").outputStream().use { bitmap.compress(Bitmap.CompressFormat.PNG, 100, it) }
      }
      Log.e("CanvasCapturePixels", "$directory $samples")
    }
    assertEquals("Native sampled pixels differ from the ordinary RN owner: $samples", 0, mismatches)
  }

  @Test
  fun hardwareReadbackPreservesDirectAndNestedDrawing() {
    val direct = hardware { it.drawColor(Color.RED) }
    assertEquals("Hardware readback lost direct drawing", Color.RED, direct.getPixel(50, 50))
    val child = RenderNode("CanvasPixelProbe").apply {
      setPosition(0, 0, this@CapturePaintTest.width, this@CapturePaintTest.height)
    }
    val canvas = child.beginRecording(width, height)
    canvas.drawColor(Color.BLUE)
    child.endRecording()
    try {
      val nested = hardware { it.drawRenderNode(child) }
      assertEquals("Hardware readback lost a nested RenderNode", Color.BLUE, nested.getPixel(50, 50))
    } finally { child.discardDisplayList() }
  }

  @Test
  fun preservesTranslucentFillBorderAndAsymmetricCornersWithoutSamplingOutlet() {
    val expected = ordinary(false)
    lateinit var owner: PaintHost
    lateinit var child: Content
    val recording = CaptureRecording()
    instrumentation.runOnMainSync {
      val views = paintHost(false)
      owner = views.first
      child = views.second
      val outlet = View(context).apply { setBackgroundColor(Color.GREEN) }
      owner.addView(outlet)
      outlet.layout(0, 0, width, height)
    }
    // HardwareRenderer.destroy releases display lists reached from its root.
    // Each independent readback therefore starts with a fresh production draw.
    fun record() = instrumentation.runOnMainSync {
      recording.record(child, owner) { child.draw(it) }
    }
    try {
      record()
      val content = hardware { it.translate(10f, 10f); it.drawRenderNode(recording.content) }
      assertEquals("Visible content recording lost its stripe", Color.BLUE, content.getPixel(50, 47))
      record()
      val sample = hardware { it.translate(10f, 10f); it.drawRenderNode(recording.material) }
      assertPixels(expected, sample)
      assertEquals(128, Color.alpha(sample.getPixel(50, 5)))
      assertEquals(0, Color.alpha(sample.getPixel(0, 0)))
      assertNotEquals(Color.GREEN, sample.getPixel(50, 50))
      record()
      val visible = hardware {
        owner.background.draw(it)
        it.translate(10f, 10f)
        it.drawRenderNode(recording.content)
      }
      assertPixels(expected, visible)
      assertEquals(128, Color.alpha(visible.getPixel(50, 5)))
    } finally { recording.discard() }
  }

  @Test
  fun preservesAuthoredOverflowInTheSample() {
    for (hidden in listOf(false, true)) {
      val expected = ordinary(hidden)
      val recording = CaptureRecording()
      instrumentation.runOnMainSync {
        val (owner, child) = paintHost(hidden)
        recording.record(child, owner) { child.draw(it) }
      }
      try {
        val sample = hardware { it.translate(10f, 10f); it.drawRenderNode(recording.material) }
        assertPixels(expected, sample)
        if (hidden) assertEquals(128, Color.alpha(sample.getPixel(5, 47)))
        else assertEquals(Color.BLUE, sample.getPixel(5, 47))
      } finally { recording.discard() }
    }
  }

  @Test
  fun invalidatesOnlyForOwnedPaintAndClearsTheRemovedConsumer() {
    instrumentation.runOnMainSync {
      val (owner, child) = paintHost(false)
      var before = child.paintNotifications
      owner.applyNativeProp("backgroundColor", Color.CYAN.toDouble())
      assertTrue(child.paintNotifications > before)
      before = child.paintNotifications
      owner.background.invalidateSelf()
      assertTrue(child.paintNotifications > before)
      before = child.paintNotifications
      child.invalidate()
      owner.invalidate()
      assertEquals(before, child.paintNotifications)
      owner.applyNativeProp("overflow", "hidden")
      assertTrue(child.paintNotifications > before)
      owner.removeView(child)
      before = child.paintNotifications
      owner.background.invalidateSelf()
      assertEquals(before, child.paintNotifications)
    }
  }

  @Test
  fun releasesAllDisplayListsWhenInactiveAndKeepsDirectBackdropPaintSingle() {
    instrumentation.runOnMainSync {
      val session = CaptureSession()
      val (owner, child) = paintHost(false)
      assertNull(session.nodes)
      session.setActive(false)
      assertNull(session.nodes)
      repeat(3) {
        session.setActive(true)
        val nodes = requireNotNull(session.nodes)
        nodes.record(child, owner) { child.draw(it) }
        val material = nodes.material
        assertTrue(nodes.content.hasDisplayList())
        assertTrue(material.hasDisplayList())
        assertNotSame(nodes.content, material)
        session.setActive(false)
        assertNull(session.nodes)
        assertFalse(nodes.content.hasDisplayList())
        assertFalse(material.hasDisplayList())
        assertSame(owner, child.parent)
      }
      session.setActive(true)
      val nodes = requireNotNull(session.nodes)
      nodes.record(child, null) { child.draw(it) }
      assertSame(nodes.content, nodes.material)
      session.setActive(false)
      assertNull(session.nodes)
    }
  }
}
