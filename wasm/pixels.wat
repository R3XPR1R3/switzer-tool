;; Steampunk Pixel Processor - WebAssembly Module
;; Operates on RGBA pixel data in linear memory
;; Used for image filter conversions (grayscale, invert, sepia, brightness)
(module
  (memory (export "memory") 4 256)

  ;; Grayscale: average of R,G,B
  (func (export "grayscale") (param $len i32)
    (local $i i32)
    (local $avg i32)
    (local.set $i (i32.const 0))
    (block $break
      (loop $loop
        (br_if $break (i32.ge_u (local.get $i) (local.get $len)))
        (local.set $avg
          (i32.div_u
            (i32.add
              (i32.add
                (i32.load8_u (local.get $i))
                (i32.load8_u (i32.add (local.get $i) (i32.const 1)))
              )
              (i32.load8_u (i32.add (local.get $i) (i32.const 2)))
            )
            (i32.const 3)
          )
        )
        (i32.store8 (local.get $i) (local.get $avg))
        (i32.store8 (i32.add (local.get $i) (i32.const 1)) (local.get $avg))
        (i32.store8 (i32.add (local.get $i) (i32.const 2)) (local.get $avg))
        (local.set $i (i32.add (local.get $i) (i32.const 4)))
        (br $loop)
      )
    )
  )

  ;; Invert: 255 - channel
  (func (export "invert") (param $len i32)
    (local $i i32)
    (local.set $i (i32.const 0))
    (block $break
      (loop $loop
        (br_if $break (i32.ge_u (local.get $i) (local.get $len)))
        (i32.store8 (local.get $i)
          (i32.sub (i32.const 255) (i32.load8_u (local.get $i))))
        (i32.store8 (i32.add (local.get $i) (i32.const 1))
          (i32.sub (i32.const 255) (i32.load8_u (i32.add (local.get $i) (i32.const 1)))))
        (i32.store8 (i32.add (local.get $i) (i32.const 2))
          (i32.sub (i32.const 255) (i32.load8_u (i32.add (local.get $i) (i32.const 2)))))
        (local.set $i (i32.add (local.get $i) (i32.const 4)))
        (br $loop)
      )
    )
  )

  ;; Sepia tone using integer approximation of standard sepia matrix
  (func (export "sepia") (param $len i32)
    (local $i i32)
    (local $r i32) (local $g i32) (local $b i32)
    (local $tr i32) (local $tg i32) (local $tb i32)
    (local.set $i (i32.const 0))
    (block $break
      (loop $loop
        (br_if $break (i32.ge_u (local.get $i) (local.get $len)))
        (local.set $r (i32.load8_u (local.get $i)))
        (local.set $g (i32.load8_u (i32.add (local.get $i) (i32.const 1))))
        (local.set $b (i32.load8_u (i32.add (local.get $i) (i32.const 2))))
        ;; tr = (r*393 + g*769 + b*189) / 1000
        (local.set $tr
          (i32.div_u
            (i32.add (i32.add
              (i32.mul (local.get $r) (i32.const 393))
              (i32.mul (local.get $g) (i32.const 769)))
              (i32.mul (local.get $b) (i32.const 189)))
            (i32.const 1000)))
        ;; tg = (r*349 + g*686 + b*168) / 1000
        (local.set $tg
          (i32.div_u
            (i32.add (i32.add
              (i32.mul (local.get $r) (i32.const 349))
              (i32.mul (local.get $g) (i32.const 686)))
              (i32.mul (local.get $b) (i32.const 168)))
            (i32.const 1000)))
        ;; tb = (r*272 + g*534 + b*131) / 1000
        (local.set $tb
          (i32.div_u
            (i32.add (i32.add
              (i32.mul (local.get $r) (i32.const 272))
              (i32.mul (local.get $g) (i32.const 534)))
              (i32.mul (local.get $b) (i32.const 131)))
            (i32.const 1000)))
        ;; Clamp to 255
        (if (i32.gt_u (local.get $tr) (i32.const 255))
          (then (local.set $tr (i32.const 255))))
        (if (i32.gt_u (local.get $tg) (i32.const 255))
          (then (local.set $tg (i32.const 255))))
        (if (i32.gt_u (local.get $tb) (i32.const 255))
          (then (local.set $tb (i32.const 255))))
        (i32.store8 (local.get $i) (local.get $tr))
        (i32.store8 (i32.add (local.get $i) (i32.const 1)) (local.get $tg))
        (i32.store8 (i32.add (local.get $i) (i32.const 2)) (local.get $tb))
        (local.set $i (i32.add (local.get $i) (i32.const 4)))
        (br $loop)
      )
    )
  )

  ;; Brightness adjust: add offset to each channel, clamped 0-255
  ;; offset is stored as value+128 (so 128=no change, 0=-128, 255=+127)
  (func (export "brightness") (param $len i32) (param $offset i32)
    (local $i i32)
    (local $val i32)
    (local $adj i32)
    (local.set $adj (i32.sub (local.get $offset) (i32.const 128)))
    (local.set $i (i32.const 0))
    (block $break
      (loop $loop
        (br_if $break (i32.ge_u (local.get $i) (local.get $len)))
        ;; R
        (local.set $val (i32.add (i32.load8_u (local.get $i)) (local.get $adj)))
        (if (i32.lt_s (local.get $val) (i32.const 0)) (then (local.set $val (i32.const 0))))
        (if (i32.gt_s (local.get $val) (i32.const 255)) (then (local.set $val (i32.const 255))))
        (i32.store8 (local.get $i) (local.get $val))
        ;; G
        (local.set $val (i32.add (i32.load8_u (i32.add (local.get $i) (i32.const 1))) (local.get $adj)))
        (if (i32.lt_s (local.get $val) (i32.const 0)) (then (local.set $val (i32.const 0))))
        (if (i32.gt_s (local.get $val) (i32.const 255)) (then (local.set $val (i32.const 255))))
        (i32.store8 (i32.add (local.get $i) (i32.const 1)) (local.get $val))
        ;; B
        (local.set $val (i32.add (i32.load8_u (i32.add (local.get $i) (i32.const 2))) (local.get $adj)))
        (if (i32.lt_s (local.get $val) (i32.const 0)) (then (local.set $val (i32.const 0))))
        (if (i32.gt_s (local.get $val) (i32.const 255)) (then (local.set $val (i32.const 255))))
        (i32.store8 (i32.add (local.get $i) (i32.const 2)) (local.get $val))
        (local.set $i (i32.add (local.get $i) (i32.const 4)))
        (br $loop)
      )
    )
  )

  ;; Contrast adjust: scale each channel relative to 128
  ;; factor stored as 0-255, where 128=1.0, 255=~2.0, 0=0.0
  (func (export "contrast") (param $len i32) (param $factor i32)
    (local $i i32)
    (local $val i32)
    (local.set $i (i32.const 0))
    (block $break
      (loop $loop
        (br_if $break (i32.ge_u (local.get $i) (local.get $len)))
        ;; R: ((pixel - 128) * factor / 128) + 128
        (local.set $val (i32.add
          (i32.div_s
            (i32.mul (i32.sub (i32.load8_u (local.get $i)) (i32.const 128)) (local.get $factor))
            (i32.const 128))
          (i32.const 128)))
        (if (i32.lt_s (local.get $val) (i32.const 0)) (then (local.set $val (i32.const 0))))
        (if (i32.gt_s (local.get $val) (i32.const 255)) (then (local.set $val (i32.const 255))))
        (i32.store8 (local.get $i) (local.get $val))
        ;; G
        (local.set $val (i32.add
          (i32.div_s
            (i32.mul (i32.sub (i32.load8_u (i32.add (local.get $i) (i32.const 1))) (i32.const 128)) (local.get $factor))
            (i32.const 128))
          (i32.const 128)))
        (if (i32.lt_s (local.get $val) (i32.const 0)) (then (local.set $val (i32.const 0))))
        (if (i32.gt_s (local.get $val) (i32.const 255)) (then (local.set $val (i32.const 255))))
        (i32.store8 (i32.add (local.get $i) (i32.const 1)) (local.get $val))
        ;; B
        (local.set $val (i32.add
          (i32.div_s
            (i32.mul (i32.sub (i32.load8_u (i32.add (local.get $i) (i32.const 2))) (i32.const 128)) (local.get $factor))
            (i32.const 128))
          (i32.const 128)))
        (if (i32.lt_s (local.get $val) (i32.const 0)) (then (local.set $val (i32.const 0))))
        (if (i32.gt_s (local.get $val) (i32.const 255)) (then (local.set $val (i32.const 255))))
        (i32.store8 (i32.add (local.get $i) (i32.const 2)) (local.get $val))
        (local.set $i (i32.add (local.get $i) (i32.const 4)))
        (br $loop)
      )
    )
  )
)
