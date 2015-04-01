import Image
import sys
try:
	im = Image.open(sys.argv[1])
	im.save(sys.argv[2])
except Exception:
	raise Exception("ppm", "ppm to jpg error") 
	sys.exit(1)
