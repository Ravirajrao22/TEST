-- ==============================================================================
-- TestHub Demo Data Seed Script: supabase/seed-demo.sql
-- Adds sample subjects, 1 test per class (Classes 8-12), and 10 questions per test.
-- All demo tests and questions are clearly marked with [DEMO].
-- ==============================================================================

do $$
declare
  v_class_8_id uuid;
  v_class_9_id uuid;
  v_class_10_id uuid;
  v_class_11_id uuid;
  v_class_12_id uuid;

  v_subj_8_id uuid;
  v_subj_9_id uuid;
  v_subj_10_id uuid;
  v_subj_11_id uuid;
  v_subj_12_id uuid;

  v_test_8_id uuid;
  v_test_9_id uuid;
  v_test_10_id uuid;
  v_test_11_id uuid;
  v_test_12_id uuid;
begin
  -- ----------------------------------------------------------------------------
  -- 1. Ensure Classes 8 to 12 exist
  -- ----------------------------------------------------------------------------
  insert into public.classes (grade) values (8) on conflict (grade) do nothing;
  insert into public.classes (grade) values (9) on conflict (grade) do nothing;
  insert into public.classes (grade) values (10) on conflict (grade) do nothing;
  insert into public.classes (grade) values (11) on conflict (grade) do nothing;
  insert into public.classes (grade) values (12) on conflict (grade) do nothing;

  select id into v_class_8_id from public.classes where grade = 8;
  select id into v_class_9_id from public.classes where grade = 9;
  select id into v_class_10_id from public.classes where grade = 10;
  select id into v_class_11_id from public.classes where grade = 11;
  select id into v_class_12_id from public.classes where grade = 12;

  -- ----------------------------------------------------------------------------
  -- 2. Ensure Sample Subjects exist
  -- ----------------------------------------------------------------------------
  insert into public.subjects (class_id, name)
  values (v_class_8_id, 'Science')
  on conflict (class_id, name) do nothing;
  select id into v_subj_8_id from public.subjects where class_id = v_class_8_id and name = 'Science';

  insert into public.subjects (class_id, name)
  values (v_class_9_id, 'Science')
  on conflict (class_id, name) do nothing;
  select id into v_subj_9_id from public.subjects where class_id = v_class_9_id and name = 'Science';

  insert into public.subjects (class_id, name)
  values (v_class_10_id, 'Science')
  on conflict (class_id, name) do nothing;
  select id into v_subj_10_id from public.subjects where class_id = v_class_10_id and name = 'Science';

  insert into public.subjects (class_id, name)
  values (v_class_11_id, 'Physics')
  on conflict (class_id, name) do nothing;
  select id into v_subj_11_id from public.subjects where class_id = v_class_11_id and name = 'Physics';

  insert into public.subjects (class_id, name)
  values (v_class_12_id, 'Physics')
  on conflict (class_id, name) do nothing;
  select id into v_subj_12_id from public.subjects where class_id = v_class_12_id and name = 'Physics';

  -- ----------------------------------------------------------------------------
  -- 3. Create 1 Test per class (Classes 8 to 12)
  -- ----------------------------------------------------------------------------
  -- Clean up prior demo tests to allow clean re-seeding
  delete from public.tests where title like '[DEMO]%';

  -- Test for Class 8
  insert into public.tests (subject_id, title, duration_minutes, marks_per_question, negative_marks, show_result, is_published)
  values (v_subj_8_id, '[DEMO] Class 8 Science - Cell Structure & Microorganisms', 15, 2, 0.5, true, true)
  returning id into v_test_8_id;

  -- Test for Class 9
  insert into public.tests (subject_id, title, duration_minutes, marks_per_question, negative_marks, show_result, is_published)
  values (v_subj_9_id, '[DEMO] Class 9 Science - Motion & Laws of Force', 15, 2, 0.5, true, true)
  returning id into v_test_9_id;

  -- Test for Class 10
  insert into public.tests (subject_id, title, duration_minutes, marks_per_question, negative_marks, show_result, is_published)
  values (v_subj_10_id, '[DEMO] Class 10 Science - Chemical Reactions & Electricity', 15, 2, 0.5, true, true)
  returning id into v_test_10_id;

  -- Test for Class 11
  insert into public.tests (subject_id, title, duration_minutes, marks_per_question, negative_marks, show_result, is_published)
  values (v_subj_11_id, '[DEMO] Class 11 Physics - Kinematics & Laws of Motion', 15, 2, 0.5, true, true)
  returning id into v_test_11_id;

  -- Test for Class 12
  insert into public.tests (subject_id, title, duration_minutes, marks_per_question, negative_marks, show_result, is_published)
  values (v_subj_12_id, '[DEMO] Class 12 Physics - Electrostatics & Current Electricity', 15, 2, 0.5, true, true)
  returning id into v_test_12_id;

  -- ----------------------------------------------------------------------------
  -- 4. Insert 10 Sample Questions for Class 8 Test
  -- ----------------------------------------------------------------------------
  insert into public.questions (test_id, position, question_text, option_a, option_b, option_c, option_d, correct_option, explanation)
  values
  (v_test_8_id, 1, '[DEMO] Which of the following is known as the powerhouse of the cell?', 'Ribosome', 'Mitochondria', 'Golgi apparatus', 'Lysosome', 'B', 'Mitochondria generate most of the chemical energy needed by the cell (ATP), earning them the title powerhouse of the cell.'),
  (v_test_8_id, 2, '[DEMO] Which organelle is present in plant cells but absent in animal cells?', 'Cell wall', 'Cell membrane', 'Cytoplasm', 'Nucleus', 'A', 'Plant cells have a rigid outer cell wall composed of cellulose which animal cells lack.'),
  (v_test_8_id, 3, '[DEMO] Bread mold is an example of which organism?', 'Virus', 'Algae', 'Fungi', 'Protozoa', 'C', 'Rhizopus stolonifer (bread mold) belongs to the kingdom of Fungi.'),
  (v_test_8_id, 4, '[DEMO] Which bacterium is responsible for the curdling of milk?', 'Rhizobium', 'Lactobacillus', 'Streptococcus', 'E. coli', 'B', 'Lactobacillus bacterium converts lactose in milk into lactic acid, causing it to coagulate into curd.'),
  (v_test_8_id, 5, '[DEMO] The green pigment essential for photosynthesis is called:', 'Hemoglobin', 'Chlorophyll', 'Carotene', 'Anthocyanin', 'B', 'Chlorophyll absorbs blue and red wavelengths from sunlight to drive the process of photosynthesis.'),
  (v_test_8_id, 6, '[DEMO] The control centre of cellular activities is the:', 'Vacuole', 'Ribosome', 'Nucleus', 'Mitochondria', 'C', 'The nucleus contains genetic material (DNA) and directs all cellular activities.'),
  (v_test_8_id, 7, '[DEMO] Penicillin, the first widely used antibiotic, was discovered from a:', 'Fungus', 'Bacterium', 'Protozoan', 'Plant root', 'A', 'Sir Alexander Fleming discovered penicillin produced by the fungus Penicillium notatum in 1928.'),
  (v_test_8_id, 8, '[DEMO] Amoeba captures its food using temporary finger-like projections called:', 'Cilia', 'Flagella', 'Pseudopodia', 'Tentacles', 'C', 'Pseudopodia (false feet) are extensions of cytoplasm used by Amoeba for locomotion and capturing food.'),
  (v_test_8_id, 9, '[DEMO] Which of the following diseases is caused by a virus?', 'Tuberculosis', 'Cholera', 'Polio', 'Typhoid', 'C', 'Poliomyelitis is caused by the poliovirus, whereas cholera and typhoid are bacterial.'),
  (v_test_8_id, 10, '[DEMO] Which gas is fixed into the soil by Rhizobium bacteria in leguminous plants?', 'Oxygen', 'Nitrogen', 'Carbon dioxide', 'Hydrogen', 'B', 'Rhizobium in root nodules fixes atmospheric nitrogen into nitrates and ammonium compounds for plant nutrition.');

  -- ----------------------------------------------------------------------------
  -- 5. Insert 10 Sample Questions for Class 9 Test
  -- ----------------------------------------------------------------------------
  insert into public.questions (test_id, position, question_text, option_a, option_b, option_c, option_d, correct_option, explanation)
  values
  (v_test_9_id, 1, '[DEMO] What is the SI unit of acceleration?', 'm/s', 'm/s^2', 'km/h', 'N-m', 'B', 'Acceleration is defined as rate of change of velocity with respect to time, so its SI unit is m/s^2.'),
  (v_test_9_id, 2, '[DEMO] Newton''s first law of motion gives the qualitative definition of:', 'Inertia', 'Force', 'Momentum', 'Work', 'A', 'Newton''s first law states that an object remains in its state of rest or uniform motion unless acted upon by an external unbalanced force, defining inertia.'),
  (v_test_9_id, 3, '[DEMO] The slope of a velocity-time graph represents which physical quantity?', 'Displacement', 'Speed', 'Acceleration', 'Distance', 'C', 'The slope of a velocity-time curve (dv/dt) gives the acceleration of the moving body.'),
  (v_test_9_id, 4, '[DEMO] If an object covers equal distances in equal intervals of time, its motion is:', 'Uniform', 'Non-uniform', 'Accelerated', 'Circular', 'A', 'Uniform motion occurs when an object travels equal distances in equal time intervals along a straight line.'),
  (v_test_9_id, 5, '[DEMO] A passenger in a moving bus tends to fall forward when the bus stops suddenly due to:', 'Inertia of rest', 'Inertia of motion', 'Inertia of direction', 'Gravitational force', 'B', 'The passenger''s upper body tends to keep moving forward due to inertia of motion while the feet come to rest with the vehicle.'),
  (v_test_9_id, 6, '[DEMO] Momentum of a body of mass m moving with velocity v is given by:', 'm * v^2', 'm * v', 'm / v', '0.5 * m * v^2', 'B', 'Momentum is defined as the product of mass and velocity: p = m * v.'),
  (v_test_9_id, 7, '[DEMO] The rate of change of momentum is directly proportional to:', 'Inertia', 'Applied unbalanced force', 'Velocity', 'Acceleration alone', 'B', 'According to Newton''s second law, F = dp/dt = m * a.'),
  (v_test_9_id, 8, '[DEMO] Recoil of a fired gun is a direct consequence of:', 'Conservation of energy', 'Newton''s third law of motion', 'First law of motion', 'Law of gravitation', 'B', 'Every action has an equal and opposite reaction; as the bullet moves forward, the gun recoils backward.'),
  (v_test_9_id, 9, '[DEMO] What is the magnitude of gravitational acceleration (g) near Earth''s surface?', '9.8 m/s^2', '8.9 m/s^2', '10.8 m/s^2', '6.67 m/s^2', 'A', 'Standard gravitational acceleration near the surface of Earth is approximately 9.8 m/s^2.'),
  (v_test_9_id, 10, '[DEMO] What is the area under a velocity-time graph equal to?', 'Velocity', 'Acceleration', 'Magnitude of displacement', 'Force', 'C', 'The area under the velocity-time curve over a time interval corresponds to the net displacement.');

  -- ----------------------------------------------------------------------------
  -- 6. Insert 10 Sample Questions for Class 10 Test
  -- ----------------------------------------------------------------------------
  insert into public.questions (test_id, position, question_text, option_a, option_b, option_c, option_d, correct_option, explanation)
  values
  (v_test_10_id, 1, '[DEMO] What type of reaction is: CaO + H2O -> Ca(OH)2 + Heat?', 'Decomposition', 'Combination and Exothermic', 'Displacement', 'Double displacement', 'B', 'Two substances combine to form a single product with release of heat, classifying it as an exothermic combination reaction.'),
  (v_test_10_id, 2, '[DEMO] The SI unit of electric potential difference (voltage) is:', 'Ampere', 'Ohm', 'Volt', 'Coulomb', 'C', 'Potential difference is measured in Volts (V), defined as one joule of energy per coulomb of charge.'),
  (v_test_10_id, 3, '[DEMO] When zinc granules react with dilute sulphuric acid, which gas is released?', 'Oxygen', 'Hydrogen', 'Carbon dioxide', 'Sulfur dioxide', 'B', 'Zn + H2SO4 -> ZnSO4 + H2(g). The gas burns with a characteristic pop sound.'),
  (v_test_10_id, 4, '[DEMO] According to Ohm''s Law, the current (I) flowing through a conductor is proportional to:', 'Resistance', 'Potential difference (V)', 'Temperature', 'Length only', 'B', 'At constant temperature, current is directly proportional to potential difference across conductor ends (V = I * R).'),
  (v_test_10_id, 5, '[DEMO] Which of the following compounds turns blue litmus paper red?', 'Baking soda solution', 'Dilute hydrochloric acid', 'Sodium hydroxide', 'Soap solution', 'B', 'Acids turn blue litmus red. Hydrochloric acid (HCl) is a strong mineral acid.'),
  (v_test_10_id, 6, '[DEMO] If three resistors of 2 ohm, 3 ohm, and 5 ohm are connected in series, the equivalent resistance is:', '10 ohm', '1.03 ohm', '30 ohm', '1 ohm', 'A', 'In series connection, equivalent resistance is the algebraic sum: R = 2 + 3 + 5 = 10 ohm.'),
  (v_test_10_id, 7, '[DEMO] Rusting of iron is an example of which chemical process?', 'Reduction', 'Oxidation and corrosion', 'Neutralization', 'Precipitation', 'B', 'Iron reacts with atmospheric oxygen and moisture to form hydrated iron(III) oxide (rust), an oxidation process.'),
  (v_test_10_id, 8, '[DEMO] What is the resistance of an ideal ammeter?', 'Zero', 'Infinite', '100 ohms', 'Variable', 'A', 'An ideal ammeter has zero internal resistance so it does not alter the circuit current when connected in series.'),
  (v_test_10_id, 9, '[DEMO] The electrical energy consumed by a device of power 1000 W operated for 1 hour is:', '1 kilowatt-hour (kWh)', '1000 Joules', '360 Joules', '10 kWh', 'A', '1 kWh = 1000 W * 3600 s = 3.6 * 10^6 Joules, representing 1 commercial electrical unit.'),
  (v_test_10_id, 10, '[DEMO] Which substance is used as an antacid to relieve stomach acidity?', 'Sodium hydroxide', 'Magnesium hydroxide (Milk of Magnesia)', 'Sulphuric acid', 'Bleaching powder', 'B', 'Magnesium hydroxide is a mild basic compound that neutralizes excess gastric hydrochloric acid safely.');

  -- ----------------------------------------------------------------------------
  -- 7. Insert 10 Sample Questions for Class 11 Test
  -- ----------------------------------------------------------------------------
  insert into public.questions (test_id, position, question_text, option_a, option_b, option_c, option_d, correct_option, explanation)
  values
  (v_test_11_id, 1, '[DEMO] Which of the following pairs has the same dimensional formula?', 'Work and Torque', 'Force and Power', 'Momentum and Energy', 'Impulse and Pressure', 'A', 'Both Work and Torque have dimensions [M L^2 T^-2].'),
  (v_test_11_id, 2, '[DEMO] At what angle of projection with the horizontal is the horizontal range of a projectile maximum?', '30 degrees', '45 degrees', '60 degrees', '90 degrees', 'B', 'Range R = (u^2 * sin(2*theta)) / g. The maximum occurs when sin(2*theta) = 1, meaning theta = 45 degrees.'),
  (v_test_11_id, 3, '[DEMO] A body sliding down a frictionless inclined plane of angle theta has acceleration:', 'g', 'g * sin(theta)', 'g * cos(theta)', 'g * tan(theta)', 'B', 'The component of gravitational acceleration acting parallel along the incline is g * sin(theta).'),
  (v_test_11_id, 4, '[DEMO] The dot product of two mutually perpendicular non-zero vectors is:', '1', 'Zero', '-1', 'Maximum', 'B', 'A . B = |A| * |B| * cos(90 degrees) = 0.'),
  (v_test_11_id, 5, '[DEMO] What is the relation between static friction (fs), kinetic friction (fk), and limiting friction (fl)?', 'fs > fl > fk', 'fk < fl and fs <= fl', 'fk > fl', 'fs = fk = fl', 'B', 'Limiting friction is the maximum static friction, and kinetic friction is slightly less than limiting friction once motion begins.'),
  (v_test_11_id, 6, '[DEMO] The area under a force-time graph represents:', 'Work done', 'Power', 'Impulse', 'Kinetic energy', 'C', 'Impulse J = integral(F dt) = change in linear momentum, given by the area under the F-t graph.'),
  (v_test_11_id, 7, '[DEMO] In an elastic collision, which physical quantities remain conserved?', 'Kinetic energy only', 'Linear momentum only', 'Both linear momentum and kinetic energy', 'Neither linear momentum nor kinetic energy', 'C', 'In a perfectly elastic collision, both total linear momentum and total mechanical kinetic energy are conserved.'),
  (v_test_11_id, 8, '[DEMO] When a car turns along a flat circular road of radius r, the necessary centripetal force is provided by:', 'Gravity', 'Normal reaction', 'Frictional force between tires and road', 'Centrifugal force', 'C', 'Friction between tires and tarmac prevents skidding and supplies the needed inward centripetal acceleration (v^2/r).'),
  (v_test_11_id, 9, '[DEMO] A bullet of mass m moving with speed v strikes and embeds in a wooden block of mass M at rest. The common speed is:', '(m * v) / (m + M)', '(M * v) / (m + M)', 'v / 2', 'm * v * M', 'A', 'From conservation of linear momentum: m * v = (m + M) * V => V = (m * v) / (m + M).'),
  (v_test_11_id, 10, '[DEMO] Work done by a conservative force along any closed path is:', 'Positive', 'Negative', 'Zero', 'Infinite', 'C', 'By definition, the line integral of a conservative force around any closed loop is identically zero.');

  -- ----------------------------------------------------------------------------
  -- 8. Insert 10 Sample Questions for Class 12 Test
  -- ----------------------------------------------------------------------------
  insert into public.questions (test_id, position, question_text, option_a, option_b, option_c, option_d, correct_option, explanation)
  values
  (v_test_12_id, 1, '[DEMO] What is the electric field inside a uniformly charged spherical conducting shell of radius R at distance r < R?', 'Zero', 'q / (4 * pi * epsilon0 * r^2)', 'q / (4 * pi * epsilon0 * R)', 'Infinite', 'A', 'By Gauss''s Law, enclosed charge inside the conducting shell is zero, so the electric field everywhere inside is zero.'),
  (v_test_12_id, 2, '[DEMO] The SI unit of capacitance is:', 'Coulomb', 'Ohm', 'Farad', 'Henry', 'C', 'Capacitance C = Q / V is measured in Farads (F), named after Michael Faraday.'),
  (v_test_12_id, 3, '[DEMO] If distance between two point charges is halved, the electrostatic force between them becomes:', 'Half', 'Double', 'Four times', 'One fourth', 'C', 'According to Coulomb''s Law, F is proportional to 1/r^2. Halving distance (r/2) multiplies force by 2^2 = 4.'),
  (v_test_12_id, 4, '[DEMO] Drift velocity of free electrons in a metallic conductor is of the order of:', '10^6 m/s', '10^8 m/s', '10^-4 m/s (few mm/s)', '3 * 10^8 m/s', 'C', 'While thermal velocities are ~10^5 m/s, the net drift velocity under standard electric fields is very small, typically ~10^-4 m/s.'),
  (v_test_12_id, 5, '[DEMO] Kirchhoff''s First Law (Current junction rule, sum of currents = 0) is a statement of conservation of:', 'Energy', 'Charge', 'Momentum', 'Angular momentum', 'B', 'The junction rule is based on charge conservation: charge cannot accumulate or vanish at an electrical junction.'),
  (v_test_12_id, 6, '[DEMO] Kirchhoff''s Second Law (Loop rule, sum of potential drops = 0) is based on conservation of:', 'Energy', 'Charge', 'Mass', 'Current', 'A', 'The loop rule reflects energy conservation: total electrical work done on charge around any closed loop is zero.'),
  (v_test_12_id, 7, '[DEMO] When a dielectric slab of dielectric constant K is inserted between plates of an isolated charged capacitor, its capacitance:', 'Decreases by K', 'Increases by factor K', 'Remains unchanged', 'Becomes zero', 'B', 'The dielectric polarizes, reducing internal electric field for a given charge, increasing capacitance: C = K * C0.'),
  (v_test_12_id, 8, '[DEMO] The temperature coefficient of resistance is negative for which of the following materials?', 'Copper', 'Aluminum', 'Silicon (Semiconductor)', 'Silver', 'C', 'Semiconductors like Silicon and Germanium have negative temperature coefficients because increased thermal excitation frees more charge carriers.'),
  (v_test_12_id, 9, '[DEMO] A wire of resistance R is stretched uniformly to twice its original length. Its new resistance will be:', '2 * R', '4 * R', 'R / 2', 'R / 4', 'B', 'When stretched to length 2*L, cross-sectional area halves (A/2) to preserve volume. Since R is proportional to L/A, new resistance = 4 * R.'),
  (v_test_12_id, 10, '[DEMO] Wheatstone bridge is balanced when the galvanometer shows:', 'Maximum deflection', 'Zero deflection (null point)', 'Half-scale deflection', 'Continuous oscillation', 'B', 'The bridge condition (P/Q = R/S) is reached at the null point where no current passes through the galvanometer.');

end $$;
